import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Admin = SupabaseClient<Database>;
export type OrgRole = "admin" | "manager" | "staff";
export const SEAT_LIMIT = 4;

export type Membership = {
  orgId: string;
  orgName: string;
  role: OrgRole;
  isOwner: boolean;
  displayName: string | null;
  email: string | null;
};

/** The organization the user belongs to — as owner or as an invited team member. */
export async function resolveMembership(admin: Admin, userId: string): Promise<Membership | null> {
  // A user may end up owning more than one organization; always resolve to the first one
  // instead of failing (maybeSingle() errors on multiple rows and would look like "no org").
  const { data: ownedRows } = await admin
    .from("organizations")
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  const owned = ownedRows?.[0] ?? null;

  const { data: memberRows } = await admin
    .from("org_members")
    .select("org_id, role, display_name, email, is_active, organizations!inner(id, name)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1);
  const member = memberRows?.[0] ?? null;

  const m = member as unknown as
    | { org_id: string; role: OrgRole; display_name: string | null; email: string | null; organizations: { name: string } }
    | null;

  if (owned) {
    return {
      orgId: owned.id,
      orgName: owned.name,
      role: "admin",
      isOwner: true,
      displayName: m?.display_name ?? null,
      email: m?.email ?? null,
    };
  }
  if (m) {
    return {
      orgId: m.org_id,
      orgName: m.organizations?.name ?? "",
      role: m.role,
      isOwner: false,
      displayName: m.display_name,
      email: m.email,
    };
  }
  return null;
}

export async function requireMembership(admin: Admin, userId: string): Promise<Membership> {
  const m = await resolveMembership(admin, userId);
  if (!m) throw new Error("No organization");
  return m;
}

export async function requireOrgAdmin(admin: Admin, userId: string): Promise<Membership> {
  const m = await requireMembership(admin, userId);
  if (m.role !== "admin") throw new Error("Forbidden: admins only");
  return m;
}

/** True when the user is the owner or an active member of the organization. */
export async function userHasOrgAccess(admin: Admin, userId: string, orgId: string): Promise<boolean> {
  const { data: owned } = await admin
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (owned) return true;
  const { data } = await admin
    .from("org_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  return !!data;
}

/** Write one digital-fingerprint entry: who did what, when. */
export async function logActivity(
  admin: Admin,
  input: {
    orgId: string;
    userId?: string | null;
    action: string;
    entity?: string | null;
    entityId?: string | null;
    eventId?: string | null;
    summary?: string | null;
    meta?: Record<string, unknown>;
    actorNameFallback?: string | null;
  },
) {
  let actorName = input.actorNameFallback ?? null;
  let actorEmail: string | null = null;
  let actorRole: OrgRole | null = null;

  if (input.userId) {
    const { data } = await admin
      .from("org_members")
      .select("display_name, email, role")
      .eq("org_id", input.orgId)
      .eq("user_id", input.userId)
      .maybeSingle();
    const row = data as { display_name: string | null; email: string | null; role: OrgRole } | null;
    if (row) {
      actorName = row.display_name ?? row.email ?? actorName;
      actorEmail = row.email;
      actorRole = row.role;
    }
  }

  await admin.from("activity_log").insert({
    org_id: input.orgId,
    actor_user_id: input.userId ?? null,
    actor_name: actorName,
    actor_email: actorEmail,
    actor_role: actorRole,
    action: input.action,
    entity: input.entity ?? null,
    entity_id: input.entityId ?? null,
    event_id: input.eventId ?? null,
    summary: input.summary ?? null,
    meta: (input.meta ?? {}) as never,
  });
}

/** Turn any pending invite for this e-mail into an active membership. */
export async function acceptInvitesForUser(admin: Admin, userId: string, email: string | null | undefined) {
  if (!email) return null;
  const lower = email.trim().toLowerCase();
  const { data: invites } = await admin
    .from("org_invites")
    .select("id, org_id, role, display_name, email")
    .is("accepted_at", null);
  const match = (invites ?? []).find((i) => (i.email ?? "").trim().toLowerCase() === lower);
  if (!match) return null;

  const { error } = await admin.from("org_members").insert({
    org_id: match.org_id,
    user_id: userId,
    role: match.role,
    email: lower,
    display_name: match.display_name ?? lower,
  });
  if (error && !`${error.message}`.includes("duplicate key")) throw new Error(error.message);

  await admin
    .from("org_invites")
    .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq("id", match.id);

  await logActivity(admin, {
    orgId: match.org_id,
    userId,
    action: "member.joined",
    entity: "org_member",
    summary: `${match.display_name ?? lower} הצטרף/ה לצוות`,
  });
  return match.org_id;
}

export type InviteMailResult = { sent: boolean; mode: "invite" | "reset" | "none"; reason?: string; link?: string | null };

/**
 * Deliver a team invitation by e-mail through Supabase Auth.
 * A brand-new address gets an invite link (set-a-password flow); an address that
 * already has an account gets a reset link instead, so it never dead-ends.
 */
export async function sendTeamInviteEmail(
  admin: Admin,
  input: { email: string; displayName?: string | null; orgName?: string | null; redirectTo: string },
): Promise<InviteMailResult> {
  const email = input.email.trim().toLowerCase();

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: input.redirectTo,
    data: {
      full_name: input.displayName ?? undefined,
      invited_to: input.orgName ?? undefined,
    },
  });

  if (!error) return { sent: true, mode: "invite", link: null };

  const msg = `${error.message ?? ""}`.toLowerCase();
  const alreadyRegistered =
    (error as { code?: string }).code === "email_exists" ||
    msg.includes("already been registered") ||
    msg.includes("already registered") ||
    msg.includes("already exists");

  if (alreadyRegistered) {
    const { data: linkData, error: resetError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: input.redirectTo },
    });
    if (!resetError) {
      return { sent: false, mode: "reset", link: linkData?.properties?.action_link ?? null };
    }
    return { sent: false, mode: "reset", reason: resetError.message };
  }

  // E-mail failed (rate limit, provider, etc.) — generate a link the admin can share manually.
  const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 12);
  const { data: linkData, error: genError } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password: tempPassword,
    options: { redirectTo: input.redirectTo },
  });
  if (!genError) {
    return { sent: false, mode: "invite", link: linkData?.properties?.action_link ?? null, reason: error.message };
  }
  return { sent: false, mode: "invite", reason: error.message };
}

/** Friendly Hebrew text for a failed invitation e-mail. */
export function inviteMailFailureText(reason: string | undefined): string {
  const msg = `${reason ?? ""}`.toLowerCase();
  if (msg.includes("rate limit") || msg.includes("only request this after") || msg.includes("too many")) {
    return "ההזמנה נשמרה, אבל הגענו למגבלת שליחת המיילים. נסי לשלוח שוב בעוד דקה, או שלחי את הקישור בוואטסאפ.";
  }
  return "ההזמנה נשמרה, אבל שליחת המייל נכשלה. אפשר להעתיק את הקישור ולשלוח ידנית בוואטסאפ.";
}

/** Build a shareable set-password / recovery link for an invited address. */
export async function buildInviteLink(
  admin: Admin,
  input: { email: string; redirectTo: string },
): Promise<string | null> {
  const email = input.email.trim().toLowerCase();
  const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 12);

  const signup = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password: tempPassword,
    options: { redirectTo: input.redirectTo },
  });
  if (!signup.error) return signup.data?.properties?.action_link ?? null;

  const recovery = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: input.redirectTo },
  });
  if (!recovery.error) return recovery.data?.properties?.action_link ?? null;
  return null;
}

/**
 * Detect which pending invites were already opened: the invited address exists in
 * Auth with a confirmed e-mail or a sign-in. Persists opened_at so the status sticks.
 */
export async function syncInviteOpenState<T extends { id: string; email: string; opened_at: string | null }>(
  admin: Admin,
  invites: T[],
): Promise<T[]> {
  const unopened = invites.filter((i) => !i.opened_at);
  if (unopened.length === 0) return invites;

  let users: Array<{ email?: string | null; email_confirmed_at?: string | null; last_sign_in_at?: string | null; confirmed_at?: string | null }> = [];
  try {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    users = data?.users ?? [];
  } catch {
    return invites;
  }

  const byEmail = new Map(users.map((u) => [(u.email ?? "").toLowerCase(), u]));
  const updates: Array<{ id: string; opened_at: string }> = [];
  for (const invite of unopened) {
    const user = byEmail.get(invite.email.toLowerCase());
    const openedAt = user?.email_confirmed_at ?? user?.confirmed_at ?? user?.last_sign_in_at ?? null;
    if (openedAt) updates.push({ id: invite.id, opened_at: openedAt });
  }
  if (updates.length === 0) return invites;

  await Promise.all(
    updates.map((u) => admin.from("org_invites").update({ opened_at: u.opened_at }).eq("id", u.id)),
  );
  const patch = new Map(updates.map((u) => [u.id, u.opened_at]));
  return invites.map((i) => (patch.has(i.id) ? { ...i, opened_at: patch.get(i.id)! } : i));
}
