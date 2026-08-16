import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MODULES, requirePlatformAdmin } from "./admin.server";

const ModuleEnum = z.enum(MODULES);

const SubscriptionInput = z.object({
  orgId: z.string().uuid(),
  module: ModuleEnum,
  plan: z.string().trim().min(1).max(40).optional(),
  status: z.enum(["trialing", "active", "past_due", "canceled", "paused"]).optional(),
  amount: z.number().min(0).max(1000000).optional(),
  currency: z.string().trim().length(3).optional(),
  current_period_end: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

const ModuleInput = z.object({
  orgId: z.string().uuid(),
  module: ModuleEnum,
  enabled: z.boolean(),
});

const TicketInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "waiting", "resolved"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  internal_notes: z.string().trim().max(2000).nullable().optional(),
});

const NewTicketInput = z.object({
  orgId: z.string().uuid().nullable().optional(),
  subject: z.string().trim().min(2).max(160),
  body: z.string().trim().max(4000).optional(),
  area: z.string().trim().max(40).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  contact_email: z.string().email().max(160).nullable().optional(),
});

const MemberInput = z.object({ memberId: z.string().uuid() });
const MemberActiveInput = z.object({ memberId: z.string().uuid(), isActive: z.boolean() });
const ResetInput = z.object({ email: z.string().email().max(160), redirectTo: z.string().url().max(400) });
const InviteInput = z.object({ inviteId: z.string().uuid() });
const ResendInviteInput = z.object({ inviteId: z.string().uuid(), redirectTo: z.string().url().max(400) });

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

/** Append an entry to the system-admin action log (never blocks the action itself). */
async function logAdminAction(
  supabaseAdmin: AdminClient,
  context: { userId: string; claims?: unknown },
  entry: {
    action: string;
    org_id?: string | null;
    target_member_id?: string | null;
    target_user_id?: string | null;
    target_email?: string | null;
    target_name?: string | null;
    summary?: string | null;
    meta?: Record<string, string | number | boolean | null>;
  },
) {
  try {
    await supabaseAdmin.from("platform_admin_log").insert({
      actor_user_id: context.userId,
      actor_email: (context.claims as { email?: string } | undefined)?.email ?? null,
      action: entry.action,
      org_id: entry.org_id ?? null,
      target_member_id: entry.target_member_id ?? null,
      target_user_id: entry.target_user_id ?? null,
      target_email: entry.target_email ?? null,
      target_name: entry.target_name ?? null,
      summary: entry.summary ?? null,
      meta: entry.meta ?? {},
    });
  } catch {
    /* logging must never break the admin action */
  }
}

/** Cheap check used to decide whether to show the system-admin area at all. */
export const amIPlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { isPlatformAdmin: !!data };
  });

/** Everything the system-admin console renders: businesses, users, billing, modules, tickets. */
export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requirePlatformAdmin(supabaseAdmin, context.userId);

    const [orgsRes, membersRes, subsRes, modsRes, ticketsRes, invitesRes] = await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select("id, name, slug, owner_id, contact_email, contact_phone, created_at")
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("org_members")
        .select("id, org_id, user_id, email, display_name, role, is_active, created_at")
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("org_subscriptions")
        .select("id, org_id, module, plan, status, amount, currency, provider, current_period_end, notes, updated_at"),
      supabaseAdmin.from("org_modules").select("id, org_id, module, enabled"),
      supabaseAdmin
        .from("support_tickets")
        .select("id, org_id, subject, body, area, priority, status, contact_email, internal_notes, created_at, resolved_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("org_invites")
        .select("id, org_id, email, display_name, role, created_at, accepted_at")
        .is("accepted_at", null)
        .order("created_at", { ascending: false }),
    ]);

    const events = await supabaseAdmin.from("events").select("id, org_id");
    const reservations = await supabaseAdmin.from("reservations").select("id, org_id");
    const adminLogRes = await supabaseAdmin
      .from("platform_admin_log")
      .select(
        "id, actor_email, action, org_id, target_email, target_name, summary, meta, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(300);

    const countBy = (rows: Array<{ org_id: string }> | null) => {
      const map: Record<string, number> = {};
      for (const r of rows ?? []) map[r.org_id] = (map[r.org_id] ?? 0) + 1;
      return map;
    };

    return {
      orgs: orgsRes.data ?? [],
      members: membersRes.data ?? [],
      subscriptions: subsRes.data ?? [],
      modules: modsRes.data ?? [],
      tickets: ticketsRes.data ?? [],
      invites: invitesRes.data ?? [],
      adminLog: adminLogRes.data ?? [],
      eventCounts: countBy(events.data),
      reservationCounts: countBy(reservations.data),
    };
  });

export const saveSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SubscriptionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requirePlatformAdmin(supabaseAdmin, context.userId);
    const { orgId, module, ...patch } = data;
    const { error } = await supabaseAdmin
      .from("org_subscriptions")
      .upsert({ org_id: orgId, module, ...patch }, { onConflict: "org_id,module" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setOrgModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ModuleInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requirePlatformAdmin(supabaseAdmin, context.userId);
    const { error } = await supabaseAdmin
      .from("org_modules")
      .upsert({ org_id: data.orgId, module: data.module, enabled: data.enabled }, { onConflict: "org_id,module" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TicketInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requirePlatformAdmin(supabaseAdmin, context.userId);
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin
      .from("support_tickets")
      .update({ ...patch, resolved_at: patch.status === "resolved" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => NewTicketInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("support_tickets").insert({
      org_id: data.orgId ?? null,
      created_by: context.userId,
      contact_email: data.contact_email ?? (context.claims as { email?: string })?.email ?? null,
      subject: data.subject,
      body: data.body ?? null,
      area: data.area ?? "general",
      priority: data.priority ?? "normal",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Freeze (suspend) or re-activate a user's access to their business. */
export const setMemberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => MemberActiveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requirePlatformAdmin(supabaseAdmin, context.userId);
    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("id, org_id, user_id, email, display_name")
      .eq("id", data.memberId)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("org_members")
      .update({ is_active: data.isActive })
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);
    await logAdminAction(supabaseAdmin, context, {
      action: data.isActive ? "member_activated" : "member_frozen",
      org_id: member?.org_id ?? null,
      target_member_id: data.memberId,
      target_user_id: member?.user_id ?? null,
      target_email: member?.email ?? null,
      target_name: member?.display_name ?? null,
    });
    return { ok: true };
  });

/** Remove a user from their business entirely. */
export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => MemberInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requirePlatformAdmin(supabaseAdmin, context.userId);
    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("id, org_id, user_id, email, display_name")
      .eq("id", data.memberId)
      .maybeSingle();
    if (!member) throw new Error("Member not found");
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("id", member.org_id)
      .eq("owner_id", member.user_id)
      .maybeSingle();
    if (org) throw new Error("Cannot remove the business owner");
    const { error } = await supabaseAdmin.from("org_members").delete().eq("id", data.memberId);
    if (error) throw new Error(error.message);
    await logAdminAction(supabaseAdmin, context, {
      action: "member_deleted",
      org_id: member.org_id,
      target_member_id: data.memberId,
      target_user_id: member.user_id,
      target_email: (member as { email?: string }).email ?? null,
      target_name: (member as { display_name?: string }).display_name ?? null,
    });
    return { ok: true };
  });

/** Send a password-reset e-mail to a user. */
export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ResetInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requirePlatformAdmin(supabaseAdmin, context.userId);
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
      redirectTo: data.redirectTo,
    });
    if (error) throw new Error(error.message);
    await logAdminAction(supabaseAdmin, context, {
      action: "password_reset_sent",
      target_email: data.email,
    });
    return { ok: true };
  });

/** Re-send the invitation e-mail for a pending invitation. */
export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ResendInviteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requirePlatformAdmin(supabaseAdmin, context.userId);
    const { inviteMailFailureText, sendTeamInviteEmail } = await import("./team.server");
    const { data: invite } = await supabaseAdmin
      .from("org_invites")
      .select("id, org_id, email, display_name, accepted_at")
      .eq("id", data.inviteId)
      .maybeSingle();
    if (!invite || invite.accepted_at) throw new Error("Invite not found or already accepted");

    const mail = await sendTeamInviteEmail(supabaseAdmin, {
      email: invite.email,
      displayName: (invite as { display_name?: string | null }).display_name ?? null,
      redirectTo: data.redirectTo,
    });

    const { error } = await supabaseAdmin
      .from("org_invites")
      .update({ created_at: new Date().toISOString() })
      .eq("id", data.inviteId);
    if (error) throw new Error(error.message);
    await logAdminAction(supabaseAdmin, context, {
      action: "invite_resent",
      org_id: (invite as { org_id?: string }).org_id ?? null,
      target_email: invite.email,
      target_name: (invite as { display_name?: string }).display_name ?? null,
      meta: { mail_sent: mail.sent, mail_mode: mail.mode },
    });
    if (!mail.sent) throw new Error(inviteMailFailureText(mail.reason));
    return { ok: true, email: invite.email, mailMode: mail.mode };
  });

/** Cancel a pending invitation. */
export const cancelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => InviteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requirePlatformAdmin(supabaseAdmin, context.userId);
    const { data: invite } = await supabaseAdmin
      .from("org_invites")
      .select("id, org_id, email, display_name")
      .eq("id", data.inviteId)
      .maybeSingle();
    const { error } = await supabaseAdmin.from("org_invites").delete().eq("id", data.inviteId);
    if (error) throw new Error(error.message);
    await logAdminAction(supabaseAdmin, context, {
      action: "invite_cancelled",
      org_id: invite?.org_id ?? null,
      target_email: invite?.email ?? null,
      target_name: invite?.display_name ?? null,
    });
    return { ok: true };
  });