import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listReviewQueue,
  decideTicketRequest,
  rescreenTicketRequest,
} from "@/lib/requests.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, ShieldCheck, Instagram, Facebook } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

type ReviewFilter = "maybe" | "pending" | "approved" | "rejected" | "all";

type ReqRow = {
  id: string;
  event_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  status: "pending" | "ai_reviewing" | "approved" | "rejected" | "maybe";
  ai_score: number | null;
  ai_reasoning: string | null;
  created_at: string;
};

type EvRow = { id: string; name: string; slug: string; start_at: string | null };

export const Route = createFileRoute("/_authenticated/reviews")({
  component: ReviewsPage,
});

function ReviewsPage() {
  const { t } = useLang();
  const [filter, setFilter] = useState<ReviewFilter>("maybe");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [events, setEvents] = useState<EvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const list = useServerFn(listReviewQueue);
  const decide = useServerFn(decideTicketRequest);
  const rescreen = useServerFn(rescreenTicketRequest);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await list({ data: { status: filter } });
      setRows(res.requests as ReqRow[]);
      setEvents(res.events as EvRow[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter, list]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const eventMap = useMemo(() => {
    const m = new Map<string, EvRow>();
    for (const e of events) m.set(e.id, e);
    return m;
  }, [events]);

  const filtered = eventFilter === "all" ? rows : rows.filter((r) => r.event_id === eventFilter);

  async function act(id: string, decision: "approved" | "rejected") {
    setBusy(id + decision);
    try {
      await decide({ data: { requestId: id, decision } });
      toast.success(decision === "approved" ? t("אושר", "Approved") : t("נדחה", "Rejected"));
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function rerun(id: string) {
    setBusy(id + "rescreen");
    try {
      await rescreen({ data: { requestId: id } });
      toast.success(t("AI רץ מחדש", "AI re-ran"));
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const tabs: { key: ReviewFilter; label: string }[] = [
    { key: "maybe", label: t("לא בטוח", "Maybe") },
    { key: "pending", label: t("ממתין ל-AI", "Awaiting AI") },
    { key: "approved", label: t("אושרו", "Approved") },
    { key: "rejected", label: t("נדחו", "Rejected") },
    { key: "all", label: t("הכל", "All") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" /> {t("תור אישורים", "Review queue")}
          </p>
          <h1 className="text-3xl font-display tracking-tight mt-1">
            {t("אישור מבלים", "Approve attendees")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "כל הבקשות שה-AI העביר לבדיקה ידנית — במקום אחד, מכל האירועים.",
              "Every request the AI flagged for manual review — one queue, across all your events.",
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setFilter(tb.key)}
            className={`h-8 px-3 rounded-full text-xs border transition ${filter === tb.key ? "bg-black text-white border-black" : "border-black/15 hover:border-black/40"}`}
          >
            {tb.label}
          </button>
        ))}
        {events.length > 1 && (
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="ms-auto h-8 rounded-full border border-black/15 bg-white text-xs px-3"
          >
            <option value="all">{t("כל האירועים", "All events")}</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("טוען…", "Loading…")}</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-black/15 bg-white">
          <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 font-medium">
            {t("אין בקשות בקטגוריה זו", "No requests in this category")}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "כשה-AI יסמן מישהו כ'לא בטוח' הוא יופיע כאן.",
              "When the AI marks someone as ‘Maybe’, they appear here.",
            )}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const ev = eventMap.get(r.event_id);
            return (
              <Card key={r.id} className="p-4 border-black/10">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium">{r.buyer_name}</div>
                      <StatusPill status={r.status} />
                      {typeof r.ai_score === "number" && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/[0.04] text-muted-foreground">
                          AI {r.ai_score}%
                        </span>
                      )}
                      {ev && (
                        <Link
                          to="/events/$id"
                          params={{ id: ev.id }}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-black/[0.04] text-muted-foreground hover:bg-black/10"
                        >
                          {ev.name}
                        </Link>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r.buyer_email}
                      {r.buyer_phone ? ` · ${r.buyer_phone}` : ""}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="text-muted-foreground self-center">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {r.instagram_url && (
                        <Shot
                          url={r.instagram_url}
                          label="Instagram"
                          icon={<Instagram className="h-3 w-3" />}
                        />
                      )}
                      {r.facebook_url && (
                        <Shot
                          url={r.facebook_url}
                          label="Facebook"
                          icon={<Facebook className="h-3 w-3" />}
                        />
                      )}
                    </div>
                    {r.ai_reasoning && (
                      <p className="mt-2 text-xs text-muted-foreground italic max-w-2xl leading-relaxed">
                        "{r.ai_reasoning}"
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy === r.id + "rescreen"}
                      onClick={() => rerun(r.id)}
                    >
                      <Sparkles className="h-3.5 w-3.5 me-1" /> {t("הרץ AI מחדש", "Re-run AI")}
                    </Button>
                    {r.status !== "approved" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy === r.id + "approved"}
                        onClick={() => act(r.id, "approved")}
                      >
                        <Check className="h-3.5 w-3.5 me-1" /> {t("אשר", "Approve")}
                      </Button>
                    )}
                    {r.status !== "rejected" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={busy === r.id + "rejected"}
                        onClick={() => act(r.id, "rejected")}
                      >
                        <X className="h-3.5 w-3.5 me-1" /> {t("דחה", "Reject")}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: ReqRow["status"] }) {
  const { t } = useLang();
  const map: Record<ReqRow["status"], { cls: string; he: string; en: string }> = {
    pending: { cls: "bg-gray-100 text-gray-700", he: "ממתין", en: "pending" },
    ai_reviewing: { cls: "bg-sky-100 text-sky-700", he: "AI בודק", en: "AI reviewing" },
    approved: { cls: "bg-emerald-100 text-emerald-700", he: "אושר", en: "approved" },
    rejected: { cls: "bg-red-100 text-red-700", he: "נדחה", en: "rejected" },
    maybe: { cls: "bg-amber-100 text-amber-800", he: "לא בטוח", en: "maybe" },
  };
  const m = map[status];
  return <span className={`px-2 py-0.5 rounded-full text-xs ${m.cls}`}>{t(m.he, m.en)}</span>;
}

function Shot({ url, label, icon }: { url: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-32 rounded-lg overflow-hidden border border-black/10 hover:border-black/30 transition"
    >
      <img src={url} alt={`${label} profile screenshot`} className="w-full h-32 object-cover" />
      <span className="flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground">
        {icon} {label}
      </span>
    </a>
  );
}
