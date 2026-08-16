import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SEAT_LIMIT,
  acceptInvitesForUser,
  buildInviteLink,
  inviteMailFailureText,
  logActivity,
  requireMembership,
  requireOrgAdmin,
  resolveMembership,
  sendTeamInviteEmail,
  syncInviteOpenState,
} from "./team.server";

const RoleEnum = z.enum(["admin", "manager", "staff"]);

const InviteInput = z.object({
  email: z.string().email().max(160),
  display_name: z.string().trim().min(1).max(80),
  role: RoleEnum,
  redirectTo: z.string().url().max(400),
});
const ResendInput = z.object({ id: z.string().uuid(), redirectTo: z.string().url().max(400) });
const MemberInput = z.object({
  memberId: z.string().uuid(),
  role: RoleEnum.optional(),
  is_active: z.boolean().optional(),
  display_name: z.string().trim().min(1).max(80).optional(),
});
const IdInput = z.object({ id: z.string().uuid() });
const ActivityInput = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  eventId: z.string().uuid().optional(),
});
const LogInput = z.object({
  action: z.string().trim().min(1).max(80),
  entity: z.string().trim().max(60).optional(),
  entityId: z.string().trim().max(80).optional(),
  eventId: z.string().uuid().optional(),
  summary: z.string().trim().max(300).optional(),
});

/** Called after sign-in: joins the org that invited this e-mail, then returns the workspace. */
export const getMyWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = (context.claims as { email?: string })?.email ?? null;
    if (!(await resolveMembership(supabaseAdmin, context.userId))) {
      await acceptInvitesForUser(supabaseAdmin, context.userId, email);
    }
    const m = await resolveMembership(supabaseAdmin, context.userId);
    if (!m) return null;
    return { orgId: m.orgId, orgName: m.orgName, role: m.role, isOwner: m.isOwner, email };
  });

export const getTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requireMembership(supabaseAdmin, context.userId);

    const { data: members } = await supabaseAdmin
      .from("org_members")
      .select("id, user_id, email, display_name, role, is_active, created_at")
      .eq("org_id", me.orgId)
      .order("created_at", { ascending: true });

    const { data: invites } = await supabaseAdmin
      .from("org_invites")
      .select(
        "id, email, display_name, role, created_at, mail_status, last_sent_at, send_count, opened_at",
      )
      .eq("org_id", me.orgId)
      .is("accepted_at", null)
      .order("created_at", { ascending: true });

    const memberRows = members ?? [];
    const inviteRows = await syncInviteOpenState(supabaseAdmin, invites ?? []);
    return {
      orgId: me.orgId,
      orgName: me.orgName,
      myRole: me.role,
      myUserId: context.userId,
      seatLimit: SEAT_LIMIT,
      seatsUsed: memberRows.length + inviteRows.length,
      members: memberRows,
      invites: inviteRows,
    };
  });

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => InviteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requireOrgAdmin(supabaseAdmin, context.userId);
    const email = data.email.trim().toLowerCase();

    const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
      supabaseAdmin
        .from("org_members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", me.orgId),
      supabaseAdmin
        .from("org_invites")
        .select("id", { count: "exact", head: true })
        .eq("org_id", me.orgId)
        .is("accepted_at", null),
    ]);
    if ((memberCount ?? 0) + (inviteCount ?? 0) >= SEAT_LIMIT) {
      throw new Error(`הגעת למכסת ${SEAT_LIMIT} המשתמשים בעסק`);
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("org_invites")
      .insert({
        org_id: me.orgId,
        email,
        display_name: data.display_name,
        role: data.role,
        invited_by: context.userId,
      })
      .select("id")
      .maybeSingle();
    if (error)
      throw new Error(
        error.message.includes("duplicate") ? "כבר קיימת הזמנה לכתובת הזו" : error.message,
      );

    const mail = await sendTeamInviteEmail(supabaseAdmin, {
      email,
      displayName: data.display_name,
      orgName: me.orgName,
      redirectTo: data.redirectTo,
    });

    if (inserted?.id) {
      await supabaseAdmin
        .from("org_invites")
        .update({
          mail_status: mail.sent ? "sent" : "failed",
          last_sent_at: new Date().toISOString(),
          send_count: 1,
        })
        .eq("id", inserted.id);
    }

    await logActivity(supabaseAdmin, {
      orgId: me.orgId,
      userId: context.userId,
      action: "member.invited",
      entity: "org_invite",
      entityId: inserted?.id ?? null,
      summary: `הוזמן/ה ${data.display_name} (${email}) בתפקיד ${data.role}`,
      meta: { mail_sent: mail.sent, mail_mode: mail.mode },
    });
    return {
      ok: true,
      email,
      mailSent: mail.sent,
      mailMode: mail.mode,
      mailError: mail.sent ? null : inviteMailFailureText(mail.reason),
      link: mail.link ?? null,
    };
  });

/** Send the invitation e-mail again for a pending invite. */
export const resendTeamInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ResendInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requireOrgAdmin(supabaseAdmin, context.userId);

    const { data: invite } = await supabaseAdmin
      .from("org_invites")
      .select("id, email, display_name, accepted_at, send_count")
      .eq("id", data.id)
      .eq("org_id", me.orgId)
      .maybeSingle();
    if (!invite || invite.accepted_at) throw new Error("ההזמנה לא נמצאה או שכבר אושרה");

    const mail = await sendTeamInviteEmail(supabaseAdmin, {
      email: invite.email,
      displayName: invite.display_name,
      orgName: me.orgName,
      redirectTo: data.redirectTo,
    });

    await supabaseAdmin
      .from("org_invites")
      .update({
        mail_status: mail.sent ? "sent" : "failed",
        last_sent_at: new Date().toISOString(),
        send_count: (invite.send_count ?? 0) + 1,
      })
      .eq("id", invite.id);

    await logActivity(supabaseAdmin, {
      orgId: me.orgId,
      userId: context.userId,
      action: "member.invite_resent",
      entity: "org_invite",
      entityId: invite.id,
      summary: `נשלחה שוב הזמנה אל ${invite.email}`,
      meta: { mail_sent: mail.sent, mail_mode: mail.mode },
    });

    if (!mail.sent) throw new Error(inviteMailFailureText(mail.reason));
    return { ok: true, email: invite.email, mailMode: mail.mode, link: mail.link ?? null };
  });

export const cancelTeamInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requireOrgAdmin(supabaseAdmin, context.userId);
    const { error } = await supabaseAdmin
      .from("org_invites")
      .delete()
      .eq("id", data.id)
      .eq("org_id", me.orgId);
    if (error) throw new Error(error.message);
    await logActivity(supabaseAdmin, {
      orgId: me.orgId,
      userId: context.userId,
      action: "member.invite_cancelled",
      entity: "org_invite",
      entityId: data.id,
    });
    return { ok: true };
  });

/** Produce a shareable invitation link for a pending invite (for manual WhatsApp/e-mail sharing). */
export const getTeamInviteLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ResendInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requireOrgAdmin(supabaseAdmin, context.userId);
    const { data: invite } = await supabaseAdmin
      .from("org_invites")
      .select("id, email, accepted_at")
      .eq("id", data.id)
      .eq("org_id", me.orgId)
      .maybeSingle();
    if (!invite || invite.accepted_at) throw new Error("ההזמנה לא נמצאה או שכבר אושרה");
    const link = await buildInviteLink(supabaseAdmin, {
      email: invite.email,
      redirectTo: data.redirectTo,
    });
    if (!link) throw new Error("לא הצלחנו לייצר קישור הזמנה. נסי שוב בעוד רגע.");
    return { ok: true, email: invite.email, link };
  });

export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => MemberInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requireOrgAdmin(supabaseAdmin, context.userId);

    const { data: row } = await supabaseAdmin
      .from("org_members")
      .select("id, user_id, display_name, email, role")
      .eq("id", data.memberId)
      .eq("org_id", me.orgId)
      .maybeSingle();
    if (!row) throw new Error("חבר צוות לא נמצא");
    if (row.user_id === context.userId && data.role && data.role !== "admin") {
      throw new Error("אי אפשר להוריד לעצמך הרשאות ניהול");
    }

    const patch: {
      role?: "admin" | "manager" | "staff";
      is_active?: boolean;
      display_name?: string;
    } = {};
    if (data.role) patch.role = data.role;
    if (typeof data.is_active === "boolean") patch.is_active = data.is_active;
    if (data.display_name) patch.display_name = data.display_name;
    const { error } = await supabaseAdmin.from("org_members").update(patch).eq("id", data.memberId);
    if (error) throw new Error(error.message);

    await logActivity(supabaseAdmin, {
      orgId: me.orgId,
      userId: context.userId,
      action: "member.updated",
      entity: "org_member",
      entityId: data.memberId,
      summary: `עודכן ${row.display_name ?? row.email ?? ""}`,
      meta: patch,
    });
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requireOrgAdmin(supabaseAdmin, context.userId);
    const { data: row } = await supabaseAdmin
      .from("org_members")
      .select("id, user_id, display_name, email")
      .eq("id", data.id)
      .eq("org_id", me.orgId)
      .maybeSingle();
    if (!row) throw new Error("חבר צוות לא נמצא");
    if (row.user_id === context.userId) throw new Error("אי אפשר להסיר את עצמך");

    const { error } = await supabaseAdmin.from("org_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabaseAdmin, {
      orgId: me.orgId,
      userId: context.userId,
      action: "member.removed",
      entity: "org_member",
      entityId: data.id,
      summary: `הוסר/ה ${row.display_name ?? row.email ?? ""}`,
    });
    return { ok: true };
  });

export const getActivityLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ActivityInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requireMembership(supabaseAdmin, context.userId);
    let q = supabaseAdmin
      .from("activity_log")
      .select(
        "id, actor_name, actor_email, actor_role, action, entity, entity_id, event_id, summary, meta, created_at",
      )
      .eq("org_id", me.orgId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.eventId) q = q.eq("event_id", data.eventId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Record a client-side action under the signed-in user's fingerprint. */
export const recordActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => LogInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = await requireMembership(supabaseAdmin, context.userId);
    await logActivity(supabaseAdmin, {
      orgId: me.orgId,
      userId: context.userId,
      action: data.action,
      entity: data.entity ?? null,
      entityId: data.entityId ?? null,
      eventId: data.eventId ?? null,
      summary: data.summary ?? null,
    });
    return { ok: true };
  });
