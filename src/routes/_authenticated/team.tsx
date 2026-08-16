import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLang } from "@/lib/i18n";
import { LinkIcon, Check } from "lucide-react";
import {
  cancelTeamInvite,
  getActivityLog,
  getTeam,
  getTeamInviteLink,
  inviteTeamMember,
  removeTeamMember,
  resendTeamInvite,
  updateTeamMember,
} from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/team")({
  component: TeamPage,
  head: () => ({
    meta: [
      { title: "צוות והרשאות | Event OS" },
      {
        name: "description",
        content: "ניהול עד 4 משתמשים לעסק, הרשאות ויומן פעילות עם טביעת אצבע דיגיטלית לכל פעולה.",
      },
      { property: "og:title", content: "צוות והרשאות | Event OS" },
      { property: "og:description", content: "ניהול משתמשים, תפקידים ויומן פעילות מלא." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Role = "admin" | "manager" | "staff";
type Team = Awaited<ReturnType<typeof getTeam>>;
type Activity = Awaited<ReturnType<typeof getActivityLog>>;

function TeamPage() {
  const { t } = useLang();
  const [team, setTeam] = useState<Team | null>(null);
  const [log, setLog] = useState<Activity>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ display_name: string; email: string; role: Role }>({
    display_name: "",
    email: "",
    role: "staff",
  });
  const [showLink, setShowLink] = useState<{ link: string; email: string } | null>(null);

  type Invite = Team["invites"][number];
  const inviteStatus = (i: Invite) => {
    if (i.opened_at)
      return { key: "opened" as const, label: t("נפתחה", "Opened"), variant: "default" as const };
    if (i.mail_status === "sent")
      return { key: "sent" as const, label: t("נשלחה", "Sent"), variant: "secondary" as const };
    if (i.mail_status === "failed")
      return {
        key: "failed" as const,
        label: t("השליחה נכשלה", "Send failed"),
        variant: "destructive" as const,
      };
    return { key: "pending" as const, label: t("ממתינה", "Pending"), variant: "outline" as const };
  };

  const roleLabel = (r: Role) =>
    r === "admin"
      ? t("אדמין", "Admin")
      : r === "manager"
        ? t("מנהל/ת משמרת", "Manager")
        : t("עובד/ת", "Staff");

  const inviteRedirect = () => `${window.location.origin}/reset-password`;

  async function copyToClipboard(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error(t("ההעתקה נכשלה", "Could not copy"));
    }
  }

  async function copyInviteLink(link: string, email: string) {
    await copyToClipboard(
      link,
      t(`הקישור להזמנה עבור ${email} הועתק`, `Invite link for ${email} copied`),
    );
  }

  async function copyInviteHint(email: string) {
    const text = t(
      `הוזמנת ל-Event OS. היכנסי ל-${window.location.origin}/auth עם הכתובת ${email} ולחצי על "שכחת סיסמה?" כדי לקבוע סיסמה.`,
      `You've been invited to Event OS. Go to ${window.location.origin}/auth with ${email} and use "Forgot password?" to set a password.`,
    );
    await copyToClipboard(
      text,
      t("ההוראות הועתקו — אפשר לשלוח בוואטסאפ", "Copied — send it over WhatsApp"),
    );
  }

  async function refresh() {
    const [teamData, logData] = await Promise.all([
      getTeam(),
      getActivityLog({ data: { limit: 100 } }),
    ]);
    setTeam(teamData);
    setLog(logData);
  }

  useEffect(() => {
    refresh().catch((e) => toast.error(e instanceof Error ? e.message : "Error"));
  }, []);

  if (!team) return <p className="text-sm text-muted-foreground">{t("טוען…", "Loading…")}</p>;

  const isAdmin = team.myRole === "admin";
  const seatsLeft = team.seatLimit - team.seatsUsed;

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

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-display tracking-tight">
        {t("צוות והרשאות", "Team & permissions")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t(
          `עד ${team.seatLimit} משתמשים לעסק — אדמין אחד ועוד שלושה תחתיו. לכל פעולה נרשמת טביעת אצבע דיגיטלית.`,
          `Up to ${team.seatLimit} users per business — one admin plus three. Every action is stamped with the user who did it.`,
        )}
      </p>

      <Tabs defaultValue="members" className="mt-6">
        <TabsList>
          <TabsTrigger value="members">{t("משתמשים", "Users")}</TabsTrigger>
          <TabsTrigger value="log">{t("יומן פעילות", "Activity log")}</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          <Card className="p-6 border-black/10">
            <div className="flex items-center justify-between">
              <div className="font-medium">{t("מושבים בשימוש", "Seats used")}</div>
              <Badge variant={seatsLeft <= 0 ? "destructive" : "secondary"}>
                {team.seatsUsed} / {team.seatLimit}
              </Badge>
            </div>

            <div className="mt-4 divide-y divide-black/5">
              {team.members.map((m) => (
                <div key={m.id} className="py-3 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{m.display_name ?? m.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                  </div>
                  {!m.is_active && <Badge variant="outline">{t("מושהה", "Suspended")}</Badge>}
                  {isAdmin && m.user_id !== team.myUserId ? (
                    <select
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={m.role}
                      disabled={busy}
                      onChange={(e) =>
                        act(() =>
                          updateTeamMember({
                            data: { memberId: m.id, role: e.target.value as Role },
                          }),
                        )
                      }
                    >
                      <option value="admin">{roleLabel("admin")}</option>
                      <option value="manager">{roleLabel("manager")}</option>
                      <option value="staff">{roleLabel("staff")}</option>
                    </select>
                  ) : (
                    <Badge>{roleLabel(m.role as Role)}</Badge>
                  )}
                  {isAdmin && m.user_id !== team.myUserId && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          act(() =>
                            updateTeamMember({ data: { memberId: m.id, is_active: !m.is_active } }),
                          )
                        }
                      >
                        {m.is_active ? t("השהיה", "Suspend") : t("הפעלה", "Activate")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => act(() => removeTeamMember({ data: { id: m.id } }))}
                      >
                        {t("הסרה", "Remove")}
                      </Button>
                    </>
                  )}
                </div>
              ))}

              {team.invites.map((i) => (
                <div key={i.id} className="py-3 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{i.display_name ?? i.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{i.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.opened_at
                        ? t(
                            `נפתחה ב-${new Date(i.opened_at).toLocaleString("he-IL")}`,
                            `Opened ${new Date(i.opened_at).toLocaleString()}`,
                          )
                        : i.last_sent_at
                          ? t(
                              `נשלחה לאחרונה ב-${new Date(i.last_sent_at).toLocaleString("he-IL")} · ${i.send_count ?? 0} שליחות`,
                              `Last sent ${new Date(i.last_sent_at).toLocaleString()} · ${i.send_count ?? 0} sends`,
                            )
                          : t("עדיין לא נשלחה", "Not sent yet")}
                    </div>
                  </div>
                  <Badge variant={inviteStatus(i).variant}>{inviteStatus(i).label}</Badge>
                  <Badge>{roleLabel(i.role as Role)}</Badge>
                  {isAdmin && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            const res = await getTeamInviteLink({
                              data: { id: i.id, redirectTo: inviteRedirect() },
                            });
                            setShowLink({ link: res.link, email: res.email });
                            await copyInviteLink(res.link, res.email);
                          })
                        }
                      >
                        <LinkIcon className="h-4 w-4 me-1.5" />
                        {t("העתקת קישור", "Copy link")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            const res = await resendTeamInvite({
                              data: { id: i.id, redirectTo: inviteRedirect() },
                            });
                            if (res.link) {
                              setShowLink({ link: res.link, email: i.email });
                            } else {
                              toast.success(
                                res.mailMode === "reset"
                                  ? t(
                                      "נשלח מייל לקביעת סיסמה (הכתובת כבר רשומה)",
                                      "Sent a set-password e-mail (address already registered)",
                                    )
                                  : t("מייל ההזמנה נשלח שוב", "Invitation e-mail sent again"),
                              );
                            }
                          })
                        }
                      >
                        {t("שליחה מחדש", "Resend")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => copyInviteHint(i.email)}>
                        {t("העתקת הוראות", "Copy instructions")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => act(() => cancelTeamInvite({ data: { id: i.id } }))}
                      >
                        {t("ביטול", "Cancel")}
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {isAdmin && (
            <Card className="p-6 border-black/10 space-y-4">
              <div className="font-medium">{t("הוספת משתמש", "Add a user")}</div>
              <p className="text-sm text-muted-foreground">
                {t(
                  "נשלח מייל הזמנה עם קישור לקביעת סיסמה. בכניסה הראשונה המשתמש מצטרף אוטומטית לעסק.",
                  "We e-mail an invitation with a set-password link. On first sign-in they join the business automatically.",
                )}
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label>{t("שם", "Name")}</Label>
                  <Input
                    className="mt-1.5"
                    value={draft.display_name}
                    onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("אימייל", "E-mail")}</Label>
                  <Input
                    className="mt-1.5"
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("תפקיד", "Role")}</Label>
                  <select
                    className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={draft.role}
                    onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}
                  >
                    <option value="admin">{roleLabel("admin")}</option>
                    <option value="manager">{roleLabel("manager")}</option>
                    <option value="staff">{roleLabel("staff")}</option>
                  </select>
                </div>
              </div>
              <Button
                className="rounded-full"
                disabled={busy || seatsLeft <= 0 || !draft.email || !draft.display_name}
                onClick={() =>
                  act(async () => {
                    const res = await inviteTeamMember({
                      data: { ...draft, redirectTo: inviteRedirect() },
                    });
                    setDraft({ display_name: "", email: "", role: "staff" });
                    if (res.link) {
                      setShowLink({ link: res.link, email: res.email });
                    } else if (!res.mailSent) {
                      toast.error(
                        res.mailError ?? t("שליחת המייל נכשלה", "Sending the e-mail failed"),
                      );
                    } else if (res.mailMode === "reset") {
                      toast.success(
                        t(
                          "נשלח מייל לקביעת סיסמה (הכתובת כבר רשומה)",
                          "Sent a set-password e-mail (address already registered)",
                        ),
                      );
                    } else {
                      toast.success(t("מייל ההזמנה נשלח", "Invitation e-mail sent"));
                    }
                  })
                }
              >
                {seatsLeft <= 0 ? t("אין מושבים פנויים", "No seats left") : t("הוספה", "Add user")}
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="log">
          <Card className="p-6 border-black/10">
            {log.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("אין עדיין פעילות רשומה.", "No recorded activity yet.")}
              </p>
            ) : (
              <div className="divide-y divide-black/5">
                {log.map((row) => (
                  <div
                    key={row.id}
                    className="py-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm"
                  >
                    <span className="font-medium">
                      {row.actor_name ?? row.actor_email ?? t("לא ידוע", "Unknown")}
                    </span>
                    {row.actor_role && (
                      <Badge variant="outline">{roleLabel(row.actor_role as Role)}</Badge>
                    )}
                    <span className="text-muted-foreground">{row.summary ?? row.action}</span>
                    <span className="ms-auto text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString("he-IL")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!showLink} onOpenChange={() => setShowLink(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{t("שלחי את הקישור ידנית", "Share the link manually")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t(
              "המייל לא יצא אוטומטית (כנראה בגלל מגבלת שולח ברירת המחדל). העתיקי את הקישור והעבירי אותו בוואטסאפ או אימייל ישירות.",
              "The e-mail didn't send automatically (likely the default sender limit). Copy the link and share it directly via WhatsApp or e-mail.",
            )}
          </p>
          {showLink && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">{t("לכתובת:", "For:")} </span>
                <span className="font-medium" dir="ltr">
                  {showLink.email}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input value={showLink.link} readOnly className="font-mono text-xs" dir="ltr" />
                <Button size="sm" onClick={() => copyInviteLink(showLink.link, showLink.email)}>
                  <LinkIcon className="h-4 w-4 me-1.5" />
                  {t("העתקה", "Copy")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
