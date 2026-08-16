import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLang } from "@/lib/i18n";
import {
  cancelInvite,
  deleteMember,
  getAdminOverview,
  resendInvite,
  saveSubscription,
  sendPasswordReset,
  setMemberActive,
  setOrgModule,
  updateSupportTicket,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminConsole,
  head: () => ({
    meta: [
      { title: "ניהול מערכת | Event OS" },
      {
        name: "description",
        content: "פאנל מנהל מערכת: עסקים ומשתמשים, מנויים ותשלומים, הפעלת מודולים וטיפול בתקלות.",
      },
      { property: "og:title", content: "ניהול מערכת | Event OS" },
      { property: "og:description", content: "ניהול לקוחות, חיובים, מודולים ותמיכה במקום אחד." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Overview = Awaited<ReturnType<typeof getAdminOverview>>;
type ModuleKey = "events" | "restaurant" | "ai" | "inventory";
type Status = "trialing" | "active" | "past_due" | "canceled" | "paused";

const MODULES: ModuleKey[] = ["events", "restaurant", "ai", "inventory"];

function AdminConsole() {
  const { t } = useLang();
  const [data, setData] = useState<Overview | null>(null);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const moduleLabel = (m: ModuleKey) =>
    m === "events"
      ? t("אירועים", "Events")
      : m === "restaurant"
        ? t("מסעדות", "Restaurant")
        : m === "ai"
          ? t("AI", "AI")
          : t("מלאי", "Inventory");

  const statusLabel = (s: string) =>
    s === "active"
      ? t("משולם", "Paid")
      : s === "past_due"
        ? t("בפיגור", "Past due")
        : s === "canceled"
          ? t("בוטל", "Canceled")
          : s === "paused"
            ? t("מוקפא", "Paused")
            : t("תקופת ניסיון", "Trial");

  const statusTone = (s: string) =>
    (s === "active" ? "default" : s === "past_due" ? "destructive" : "secondary") as
      "default" | "destructive" | "secondary";

  async function refresh() {
    try {
      setData(await getAdminOverview());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      if (msg.includes("Forbidden")) setDenied(true);
      else toast.error(msg);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const orgs = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.orgs.filter((o) =>
      !needle
        ? true
        : `${o.name} ${o.slug} ${o.contact_email ?? ""}`.toLowerCase().includes(needle),
    );
  }, [data, q]);

  if (denied) {
    return (
      <Card className="p-6 border-black/10">
        <p className="text-sm">
          {t("האזור הזה פתוח למנהלי המערכת בלבד.", "This area is for system administrators only.")}
        </p>
      </Card>
    );
  }
  if (!data) return <p className="text-sm text-muted-foreground">{t("טוען…", "Loading…")}</p>;

  const subFor = (orgId: string, module: ModuleKey) =>
    data.subscriptions.find((s) => s.org_id === orgId && s.module === module);
  const moduleOn = (orgId: string, module: ModuleKey) =>
    data.modules.find((m) => m.org_id === orgId && m.module === module)?.enabled ?? false;

  const mrr = data.subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + Number(s.amount ?? 0), 0);
  const unpaid = data.subscriptions.filter((s) => s.status === "past_due").length;
  const openTickets = data.tickets.filter((x) => x.status !== "resolved").length;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">{t("ניהול מערכת", "System admin")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            "כל הלקוחות של המערכת: מי משלם, אילו מודולים פעילים ואילו תקלות פתוחות.",
            "Every customer on the platform: who pays, which modules are on, and what is broken.",
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: t("עסקים", "Businesses"), value: data.orgs.length },
          { label: t("משתמשים", "Users"), value: data.members.length },
          { label: t("הכנסה חודשית", "Monthly revenue"), value: `₪${mrr.toLocaleString("he-IL")}` },
          { label: t("חובות פתוחים", "Past due"), value: unpaid },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-4 border-black/10">
            <div className="text-xs text-muted-foreground">{kpi.label}</div>
            <div className="mt-1 text-2xl font-semibold">{kpi.value}</div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="orgs">
        <TabsList>
          <TabsTrigger value="orgs">{t("עסקים ומשתמשים", "Businesses & users")}</TabsTrigger>
          <TabsTrigger value="billing">{t("מנויים ותשלומים", "Subscriptions")}</TabsTrigger>
          <TabsTrigger value="modules">{t("מודולים", "Modules")}</TabsTrigger>
          <TabsTrigger value="support">
            {t("תקלות", "Support")}
            {openTickets > 0 && <Badge className="ms-2">{openTickets}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="log">{t("יומן פעולות", "Action log")}</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <Input
            placeholder={t("חיפוש עסק…", "Search a business…")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <TabsContent value="orgs" className="space-y-4">
          {orgs.map((o) => {
            const members = data.members.filter((m) => m.org_id === o.id);
            const invites = data.invites.filter((i) => i.org_id === o.id);
            return (
              <Card key={o.id} className="p-5 border-black/10">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <div className="font-medium">{o.name}</div>
                  <span className="text-xs text-muted-foreground">/{o.slug}</span>
                  <span className="ms-auto text-xs text-muted-foreground">
                    {t("נרשם", "Joined")} {new Date(o.created_at).toLocaleDateString("he-IL")}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {o.contact_email ?? "—"} · {o.contact_phone ?? "—"} · {t("אירועים", "Events")}:{" "}
                  {data.eventCounts[o.id] ?? 0} · {t("הזמנות מקום", "Reservations")}:{" "}
                  {data.reservationCounts[o.id] ?? 0}
                </div>
                <div className="mt-3 divide-y divide-black/5">
                  {members.length === 0 && invites.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("אין עדיין חברי צוות.", "No team members yet.")}
                    </p>
                  )}
                  {members.map((m) => (
                    <div key={m.id} className="py-2 flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-medium">{m.display_name ?? m.email}</span>
                      <span className="text-xs text-muted-foreground">{m.email}</span>
                      <Badge variant="outline">{m.role}</Badge>
                      {!m.is_active && <Badge variant="secondary">{t("מושהה", "Suspended")}</Badge>}
                      <div className="ms-auto flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          disabled={busy}
                          onClick={() =>
                            act(() =>
                              setMemberActive({ data: { memberId: m.id, isActive: !m.is_active } }),
                            )
                          }
                        >
                          {m.is_active ? t("הקפאה", "Freeze") : t("הפעלה", "Activate")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          disabled={busy || !m.email}
                          onClick={() =>
                            act(async () => {
                              await sendPasswordReset({
                                data: {
                                  email: m.email!,
                                  redirectTo: `${window.location.origin}/reset-password`,
                                },
                              });
                              toast.success(
                                t("נשלח מייל לאיפוס סיסמה", "Password reset e-mail sent"),
                              );
                            })
                          }
                        >
                          {t("איפוס סיסמה", "Reset password")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-destructive"
                          disabled={busy}
                          onClick={() => {
                            if (
                              !window.confirm(
                                t("למחוק את המשתמש מהעסק?", "Remove this user from the business?"),
                              )
                            )
                              return;
                            act(async () => {
                              await deleteMember({ data: { memberId: m.id } });
                              toast.success(t("המשתמש הוסר", "User removed"));
                            });
                          }}
                        >
                          {t("מחיקה", "Delete")}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {invites.map((i) => (
                    <div key={i.id} className="py-2 flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-medium">{i.display_name ?? i.email}</span>
                      <span className="text-xs text-muted-foreground">{i.email}</span>
                      <Badge variant="outline">{i.role}</Badge>
                      <Badge variant="secondary">{t("ממתין להצטרפות", "Pending")}</Badge>
                      <div className="ms-auto flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          disabled={busy}
                          onClick={() =>
                            act(async () => {
                              const res = await resendInvite({
                                data: {
                                  inviteId: i.id,
                                  redirectTo: `${window.location.origin}/reset-password`,
                                },
                              });
                              toast.success(
                                res.mailMode === "reset"
                                  ? t(
                                      "נשלח מייל לקביעת סיסמה (המשתמש כבר רשום)",
                                      "Sent a set-password e-mail (user already registered)",
                                    )
                                  : t("מייל ההזמנה נשלח מחדש", "Invitation e-mail resent"),
                              );
                            })
                          }
                        >
                          {t("שליחת הזמנה מחדש", "Resend invite")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-destructive"
                          disabled={busy}
                          onClick={() => act(() => cancelInvite({ data: { inviteId: i.id } }))}
                        >
                          {t("ביטול", "Cancel")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          {orgs.map((o) => (
            <Card key={o.id} className="p-5 border-black/10 space-y-4">
              <div className="font-medium">{o.name}</div>
              {MODULES.filter((m) => m !== "inventory").map((module) => {
                const sub = subFor(o.id, module);
                return (
                  <SubscriptionRow
                    key={module}
                    label={moduleLabel(module)}
                    statusLabel={statusLabel}
                    tone={statusTone}
                    busy={busy}
                    sub={sub}
                    onSave={(patch) =>
                      act(() => saveSubscription({ data: { orgId: o.id, module, ...patch } }))
                    }
                    t={t}
                  />
                );
              })}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          {orgs.map((o) => (
            <Card key={o.id} className="p-5 border-black/10">
              <div className="font-medium">{o.name}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {MODULES.map((module) => (
                  <label
                    key={module}
                    className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-3 py-2"
                  >
                    <span className="text-sm">{moduleLabel(module)}</span>
                    <Switch
                      checked={moduleOn(o.id, module)}
                      disabled={busy}
                      onCheckedChange={(v) =>
                        act(() => setOrgModule({ data: { orgId: o.id, module, enabled: v } }))
                      }
                    />
                  </label>
                ))}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          {data.tickets.length === 0 && (
            <Card className="p-6 border-black/10">
              <p className="text-sm text-muted-foreground">
                {t("אין תקלות פתוחות.", "No tickets yet.")}
              </p>
            </Card>
          )}
          {data.tickets.map((ticket) => {
            const org = data.orgs.find((o) => o.id === ticket.org_id);
            return (
              <Card key={ticket.id} className="p-5 border-black/10 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="font-medium">{ticket.subject}</div>
                  <Badge variant={ticket.priority === "urgent" ? "destructive" : "outline"}>
                    {ticket.priority}
                  </Badge>
                  <Badge variant={ticket.status === "resolved" ? "secondary" : "default"}>
                    {ticket.status}
                  </Badge>
                  <span className="ms-auto text-xs text-muted-foreground">
                    {org?.name ?? t("ללא עסק", "No business")} ·{" "}
                    {new Date(ticket.created_at).toLocaleString("he-IL")}
                  </span>
                </div>
                {ticket.body && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.body}</p>
                )}
                <TicketControls ticket={ticket} busy={busy} act={act} t={t} />
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="log" className="space-y-4">
          <Card className="p-5 border-black/10">
            <div className="text-sm font-medium">
              {t("יומן פעולות ניהול", "System admin action log")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "מחיקה, הקפאה/הפעלה, איפוס סיסמה ושליחת הזמנות מחדש — עם תאריך ושעת ביצוע.",
                "Deletions, freeze/activate, password resets and invite resends — with date and time.",
              )}
            </p>
            <div className="mt-4 space-y-2">
              {(data.adminLog ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("עדיין לא בוצעו פעולות.", "No actions recorded yet.")}
                </p>
              )}
              {(data.adminLog ?? [])
                .filter((row) => {
                  const needle = q.trim().toLowerCase();
                  if (!needle) return true;
                  const org = data.orgs.find((o) => o.id === row.org_id);
                  return `${org?.name ?? ""} ${row.target_email ?? ""} ${row.target_name ?? ""}`
                    .toLowerCase()
                    .includes(needle);
                })
                .map((row) => {
                  const org = data.orgs.find((o) => o.id === row.org_id);
                  const meta = ADMIN_ACTIONS[row.action] ?? {
                    he: row.action,
                    en: row.action,
                    tone: "outline" as const,
                  };
                  return (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-black/10 px-3 py-2"
                    >
                      <Badge variant={meta.tone}>{t(meta.he, meta.en)}</Badge>
                      <span className="text-sm">
                        {row.target_name || row.target_email || t("—", "—")}
                        {row.target_name && row.target_email && (
                          <span className="text-muted-foreground"> · {row.target_email}</span>
                        )}
                      </span>
                      {org && <span className="text-xs text-muted-foreground">{org.name}</span>}
                      <span className="ms-auto text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString("he-IL")}
                        {row.actor_email ? ` · ${row.actor_email}` : ""}
                      </span>
                    </div>
                  );
                })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const ADMIN_ACTIONS: Record<
  string,
  { he: string; en: string; tone: "default" | "secondary" | "destructive" | "outline" }
> = {
  member_deleted: { he: "מחיקת משתמש", en: "User deleted", tone: "destructive" },
  member_frozen: { he: "הקפאת משתמש", en: "User frozen", tone: "secondary" },
  member_activated: { he: "הפעלת משתמש", en: "User activated", tone: "default" },
  password_reset_sent: { he: "איפוס סיסמה", en: "Password reset", tone: "outline" },
  invite_resent: { he: "שליחת הזמנה מחדש", en: "Invite resent", tone: "outline" },
  invite_cancelled: { he: "ביטול הזמנה", en: "Invite cancelled", tone: "secondary" },
};

function SubscriptionRow({
  label,
  sub,
  busy,
  onSave,
  statusLabel,
  tone,
  t,
}: {
  label: string;
  sub?: {
    status: string;
    plan: string;
    amount: number;
    current_period_end: string | null;
    notes: string | null;
  };
  busy: boolean;
  onSave: (patch: {
    plan?: string;
    status?: Status;
    amount?: number;
    current_period_end?: string | null;
    notes?: string | null;
  }) => void;
  statusLabel: (s: string) => string;
  tone: (s: string) => "default" | "destructive" | "secondary";
  t: (he: string, en: string) => string;
}) {
  const [plan, setPlan] = useState(sub?.plan ?? "starter");
  const [amount, setAmount] = useState(String(sub?.amount ?? 0));
  const [status, setStatus] = useState<Status>((sub?.status as Status) ?? "trialing");
  const [renew, setRenew] = useState(sub?.current_period_end?.slice(0, 10) ?? "");

  useEffect(() => {
    setPlan(sub?.plan ?? "starter");
    setAmount(String(sub?.amount ?? 0));
    setStatus((sub?.status as Status) ?? "trialing");
    setRenew(sub?.current_period_end?.slice(0, 10) ?? "");
  }, [sub?.plan, sub?.amount, sub?.status, sub?.current_period_end]);

  return (
    <div className="rounded-lg border border-black/10 p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant={tone(status)}>{statusLabel(status)}</Badge>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-5 items-end">
        <div>
          <Label className="text-xs">{t("מסלול", "Plan")}</Label>
          <Input className="mt-1" value={plan} onChange={(e) => setPlan(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">{t("סכום חודשי (₪)", "Monthly (₪)")}</Label>
          <Input
            className="mt-1"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">{t("סטטוס", "Status")}</Label>
          <select
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            <option value="trialing">{t("ניסיון", "Trial")}</option>
            <option value="active">{t("משולם", "Paid")}</option>
            <option value="past_due">{t("בפיגור", "Past due")}</option>
            <option value="paused">{t("מוקפא", "Paused")}</option>
            <option value="canceled">{t("בוטל", "Canceled")}</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">{t("חידוש", "Renews")}</Label>
          <Input
            className="mt-1"
            type="date"
            value={renew}
            onChange={(e) => setRenew(e.target.value)}
          />
        </div>
        <Button
          className="rounded-full"
          disabled={busy}
          onClick={() =>
            onSave({
              plan,
              amount: Number(amount) || 0,
              status,
              current_period_end: renew ? new Date(`${renew}T00:00:00Z`).toISOString() : null,
            })
          }
        >
          {t("שמירה", "Save")}
        </Button>
      </div>
    </div>
  );
}

function TicketControls({
  ticket,
  busy,
  act,
  t,
}: {
  ticket: { id: string; status: string; priority: string; internal_notes: string | null };
  busy: boolean;
  act: (fn: () => Promise<unknown>) => void;
  t: (he: string, en: string) => string;
}) {
  const [notes, setNotes] = useState(ticket.internal_notes ?? "");
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] items-end">
      <div>
        <Label className="text-xs">{t("הערות פנימיות", "Internal notes")}</Label>
        <Textarea
          className="mt-1"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={ticket.priority}
        disabled={busy}
        onChange={(e) =>
          act(() =>
            updateSupportTicket({
              data: {
                id: ticket.id,
                priority: e.target.value as "low" | "normal" | "high" | "urgent",
              },
            }),
          )
        }
      >
        <option value="low">{t("נמוכה", "Low")}</option>
        <option value="normal">{t("רגילה", "Normal")}</option>
        <option value="high">{t("גבוהה", "High")}</option>
        <option value="urgent">{t("דחוף", "Urgent")}</option>
      </select>
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={ticket.status}
        disabled={busy}
        onChange={(e) =>
          act(() =>
            updateSupportTicket({
              data: {
                id: ticket.id,
                status: e.target.value as "open" | "in_progress" | "waiting" | "resolved",
              },
            }),
          )
        }
      >
        <option value="open">{t("פתוחה", "Open")}</option>
        <option value="in_progress">{t("בטיפול", "In progress")}</option>
        <option value="waiting">{t("ממתינה ללקוח", "Waiting")}</option>
        <option value="resolved">{t("טופלה", "Resolved")}</option>
      </select>
      <Button
        variant="outline"
        className="rounded-full"
        disabled={busy}
        onClick={() =>
          act(() => updateSupportTicket({ data: { id: ticket.id, internal_notes: notes || null } }))
        }
      >
        {t("שמירת הערה", "Save note")}
      </Button>
    </div>
  );
}
