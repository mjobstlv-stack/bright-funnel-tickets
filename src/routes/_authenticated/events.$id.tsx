import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2, Video, Sparkles, ImagePlus, X, ArrowUp, ArrowDown, Eye, EyeOff, Image as ImageIcon, Copy, AlertTriangle, ShieldAlert } from "lucide-react";
import { Check, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { EventExtras, DEFAULT_SECTIONS, SECTION_LABELS, mergeSectionsWithDefaults, type ScheduleItem, type HighlightItem, type IncludeItem, type FaqItem, type LocationInfo, type SectionEntry, type SectionKey } from "@/components/event/EventExtras";
import { AddressAutocomplete } from "@/components/event/AddressAutocomplete";
import { EventBudgetTab } from "@/components/event/EventBudgetTab";
import { EventDaysField, type DayHours } from "@/components/event/EventDaysField";
import { LogoPlacementEditor } from "@/components/event/LogoPlacementEditor";
import { IconPicker } from "@/components/event/IconPicker";
import { IconTextField } from "@/components/event/IconTextField";
import type { LogoLayout } from "@/components/event/logo-placement";
import { useServerFn } from "@tanstack/react-start";
import { generateMeetLink } from "@/lib/meet.functions";
import { getEventForOwner } from "@/lib/events.functions";
import { generateEventPage } from "@/lib/ai-page.functions";
import { decideTicketRequest, rescreenTicketRequest } from "@/lib/requests.functions";
import { testApprovalCriteria } from "@/lib/requests.functions";
import { parseEventContent } from "@/lib/ai-content.functions";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/events/$id")({
  component: EventDetail,
  validateSearch: (search: Record<string, unknown>): { tab?: string } =>
    typeof search.tab === "string" ? { tab: search.tab } : {},
});

const TEMPLATES: { key: string; label: string; desc: string }[] = [
  { key: "classic", label: "Classic", desc: "Banner + content" },
  { key: "poster", label: "Poster", desc: "Dark, centered logo" },
  { key: "split", label: "Split", desc: "Image + text" },
  { key: "minimal", label: "Minimal", desc: "Typography first" },
  { key: "immersive", label: "Immersive", desc: "Full-screen cover" },
];

function TemplateThumb({ keyName }: { keyName: string }) {
  const base = "w-full h-full p-2";
  if (keyName === "poster") return (
    <div className={`${base} bg-neutral-900`}>
      <div className="h-full rounded-md bg-gradient-to-br from-pink-300/60 to-sky-400/60 flex flex-col items-center justify-center gap-1.5">
        <div className="h-5 w-10 rounded bg-white/90" />
        <div className="h-1.5 w-16 rounded bg-white/90" />
        <div className="h-1 w-10 rounded bg-white/60" />
      </div>
    </div>
  );
  if (keyName === "split") return (
    <div className={`${base} bg-white`}>
      <div className="h-full rounded-md grid grid-cols-2 gap-1 overflow-hidden">
        <div className="bg-gradient-to-br from-pink-200 to-sky-200 flex items-center justify-center"><div className="h-4 w-4 rounded bg-white/90" /></div>
        <div className="bg-neutral-100 p-1.5 flex flex-col gap-1 justify-center"><div className="h-1.5 w-10 rounded bg-neutral-400" /><div className="h-1 w-8 rounded bg-neutral-300" /><div className="h-1 w-6 rounded bg-neutral-300" /></div>
      </div>
    </div>
  );
  if (keyName === "minimal") return (
    <div className={`${base} bg-white`}>
      <div className="h-full rounded-md border border-neutral-200 flex flex-col items-center justify-start gap-1.5 pt-3">
        <div className="h-3 w-3 rounded bg-neutral-900" />
        <div className="h-1.5 w-14 rounded bg-neutral-800 mt-2" />
        <div className="h-1 w-8 rounded bg-neutral-300" />
        <div className="mt-2 h-6 w-16 rounded bg-neutral-100" />
      </div>
    </div>
  );
  if (keyName === "immersive") return (
    <div className={`${base} bg-neutral-900`}>
      <div className="h-full rounded-md relative overflow-hidden bg-gradient-to-br from-pink-300 to-sky-400">
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 h-2 w-5 rounded bg-white/90" />
        <div className="absolute left-2 bottom-2 h-1.5 w-12 rounded bg-white/90" />
        <div className="absolute left-2 bottom-1 h-1 w-8 rounded bg-white/60" />
      </div>
    </div>
  );
  // classic
  return (
    <div className={`${base} bg-white`}>
      <div className="h-full rounded-md overflow-hidden border border-neutral-200 flex flex-col">
        <div className="h-1/2 bg-gradient-to-br from-pink-200 to-sky-200 flex items-center justify-center"><div className="h-3 w-6 rounded bg-white/90" /></div>
        <div className="flex-1 p-1.5 flex flex-col gap-1"><div className="h-1.5 w-12 rounded bg-neutral-700" /><div className="h-1 w-16 rounded bg-neutral-300" /><div className="h-1 w-10 rounded bg-neutral-300" /></div>
      </div>
    </div>
  );
}

type TesterImage = { source: "instagram" | "facebook"; url: string; screenshot: string | null; error: string | null };
function CriteriaTester({ criteria, visualCriteria, eventName }: { criteria: string; visualCriteria: string; eventName: string }) {
  const { t } = useLang();
  const testFn = useServerFn(testApprovalCriteria);
  const [igShot, setIgShot] = useState<string | null>(null);
  const [fbShot, setFbShot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { decision: string; score: number | null; reasoning: string; images: TesterImage[] }>(null);

  async function run() {
    if (!criteria.trim()) { toast.error(t("כתוב קריטריונים קודם", "Write criteria first")); return; }
    if (!igShot && !fbShot) { toast.error(t("העלה לפחות צילום מסך אחד", "Upload at least one screenshot")); return; }
    setBusy(true);
    setResult(null);
    try {
      const r = await testFn({ data: {
        criteria,
        visualCriteria,
        eventName,
        instagramScreenshot: igShot,
        facebookScreenshot: fbShot,
      } });
      setResult(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const badgeCls = result?.decision === "approved" ? "bg-emerald-100 text-emerald-800"
    : result?.decision === "rejected" ? "bg-red-100 text-red-800"
    : "bg-amber-100 text-amber-800";

  return (
    <div className="mt-3 rounded-lg border border-dashed border-black/15 bg-white/60 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5" />
        <div className="text-xs font-medium">{t("בדיקת קריטריונים", "Test criteria")}</div>
        <div className="text-[11px] text-muted-foreground">{t("העלה צילום מסך של פרופיל דוגמה", "Upload a screenshot of a sample profile")}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ShotUpload label="Instagram" shot={igShot} onChange={setIgShot} />
        <ShotUpload label="Facebook" shot={fbShot} onChange={setFbShot} />
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={run} disabled={busy} className="rounded-full">
          <Sparkles className="h-3.5 w-3.5" />
          {busy ? t("בודק…", "Testing…") : t("בדוק", "Test")}
        </Button>
        {result && (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeCls}`}>
            {result.decision}
            {result.score !== null && ` · ${result.score}%`}
          </span>
        )}
      </div>
      {result?.reasoning && (
        <div className="text-xs text-muted-foreground leading-relaxed border-t border-black/5 pt-2 whitespace-pre-wrap">
          {result.reasoning}
        </div>
      )}
    </div>
  );
}

function ShotUpload({ label, shot, onChange }: { label: string; shot: string | null; onChange: (v: string | null) => void }) {
  const { t } = useLang();
  const inputId = `shot-upload-${label.toLowerCase()}`;
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error(t("קובץ לא תקין", "Invalid file")); return; }
    if (f.size > 6 * 1024 * 1024) { toast.error(t("הקובץ גדול מדי (מקס׳ 6MB)", "File too large (max 6MB)")); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(f);
  }
  return (
    <div className="relative">
      <input id={inputId} type="file" accept="image/*" onChange={onFile} className="hidden" />
      {shot ? (
        <div className="relative rounded-md overflow-hidden border border-black/10 bg-white h-24">
          <img src={shot} alt={label} className="w-full h-full object-cover object-top" />
          <div className="absolute top-1 start-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-black/60 text-white">{label}</div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1 end-1 h-5 w-5 grid place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label={t("הסר", "Remove")}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex flex-col items-center justify-center gap-1 h-24 rounded-md border border-dashed border-black/20 bg-black/[0.02] text-muted-foreground cursor-pointer hover:bg-black/[0.04] text-center px-2"
        >
          <ImagePlus className="h-4 w-4" />
          <div className="text-[11px] font-medium text-foreground">{label}</div>
          <div className="text-[10px]">{t("העלה צילום מסך", "Upload screenshot")}</div>
        </label>
      )}
    </div>
  );
}

function ManualReviewPanel({ url, source, error }: { url: string; source: "instagram" | "facebook"; error: string | null }) {
  const { t } = useLang();
  const [shot, setShot] = useState<string | null>(null);
  const inputId = `manual-shot-${source}`;
  const is403 = !!error && /\b(403|401|blocked|login|bot)/i.test(error);
  const isPrivate = !!error && /private/i.test(error);
  const reason = is403
    ? t("החשבון חסם סריקה אוטומטית (403)", "Profile blocked automated scan (403)")
    : isPrivate
      ? t("הפרופיל פרטי", "Profile is private")
      : (error ?? t("לא ניתן היה לצלם את הפרופיל", "Could not capture the profile"));
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error(t("קובץ לא תקין", "Invalid file")); return; }
    const reader = new FileReader();
    reader.onload = () => setShot(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(f);
  }
  return (
    <div className="p-3 space-y-2 text-[11px]">
      <div className="flex items-start gap-1.5 text-amber-800">
        <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <div>
          <div className="font-medium leading-tight">{t("נדרשת בדיקה ידנית", "Manual review required")}</div>
          <div className="text-amber-700/90 leading-tight mt-0.5">{reason}</div>
        </div>
      </div>
      {shot ? (
        <div className="relative rounded-md overflow-hidden border border-black/10 bg-black/[0.02]">
          <img src={shot} alt={`${source} manual screenshot`} className="w-full max-h-56 object-contain bg-white" />
          <button
            type="button"
            onClick={() => setShot(null)}
            className="absolute top-1 end-1 h-6 w-6 grid place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label={t("הסר", "Remove")}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex flex-col items-center justify-center gap-1 h-28 rounded-md border border-dashed border-black/20 bg-black/[0.02] text-muted-foreground cursor-pointer hover:bg-black/[0.04] text-center px-2"
        >
          <ImagePlus className="h-4 w-4" />
          <div className="text-[11px] font-medium text-foreground">{t("העלה צילום מסך של הפרופיל", "Upload profile screenshot")}</div>
          <div className="text-[10px]">{t("פתח/י את הפרופיל, צלמ/י ומחק/י את המדיה הרגישה במידת הצורך", "Open the profile, take a screenshot, redact sensitive info if needed")}</div>
        </label>
      )}
      <input id={inputId} type="file" accept="image/*" onChange={onFile} className="hidden" />
      <div className="flex flex-wrap gap-1.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 h-6 px-2 rounded-full border border-black/15 hover:bg-black/[0.04]"
        >
          <ExternalLink className="h-3 w-3" /> {t("פתח פרופיל", "Open profile")}
        </a>
        {shot && (
          <label htmlFor={inputId} className="inline-flex items-center gap-1 h-6 px-2 rounded-full border border-black/15 hover:bg-black/[0.04] cursor-pointer">
            <ImagePlus className="h-3 w-3" /> {t("החלף צילום", "Replace screenshot")}
          </label>
        )}
      </div>
      <ol className="list-decimal ps-4 space-y-0.5 text-muted-foreground leading-snug">
        <li>{t("פתח/י את הקישור בכרטיסייה חדשה תוך כניסה לחשבון שלך.", "Open the link in a new tab while logged in to your own account.")}</li>
        <li>{t("בדוק/י שהפרופיל תואם את הקריטריונים שהגדרת.", "Check that the profile matches the criteria you set.")}</li>
        <li>{t("חזור/חזרי לרשימת הבקשות ולחצ/י אשר או דחה בהתאם.", "Return to the requests list and press Approve or Reject accordingly.")}</li>
      </ol>
      <div className="flex items-center gap-1 text-[10px] text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        <span>{t("הבקשה תסומן ‘לא בטוח’ עד להחלטה ידנית", "The request stays marked ‘Maybe’ until you decide")}</span>
      </div>
    </div>
  );
}

type EventT = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  venue_name: string | null;
  venue_address: string | null;
  start_at: string | null;
  end_at: string | null;
  status: string;
  currency: string;
  cover_url: string | null;
  cover_video_url: string | null;
  event_type: "physical" | "virtual" | "hybrid";
  online_url: string | null;
  meeting_provider: "manual" | "google_meet" | "zoom" | "teams" | null;
  meeting_event_id: string | null;
  logo_url: string | null;
  circle_logo_url: string | null;
  logo_layout: LogoLayout | null;
  template: string;
  schedule: ScheduleItem[] | null;
  highlights: HighlightItem[] | null;
  video_url: string | null;
  includes: IncludeItem[] | null;
  faq: FaqItem[] | null;
  location_info: LocationInfo | null;
  rules: string[] | null;
  bg_color: string | null;
  text_color: string | null;
  sections: SectionEntry[] | null;
  gallery: string[] | null;
  requires_approval: boolean;
  approval_criteria: string | null;
  visual_criteria: string | null;
  require_instagram: boolean;
  require_facebook: boolean;
  sale_mode: SaleMode;
  booking_slug: string | null;
  booking_deposit_enabled: boolean;
  booking_deposit_per_guest: number;
  day_hours: DayHours[] | null;
};

type SaleMode = "tickets" | "booking";

type TicketType = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  is_active: boolean;
  sort_order: number;
  kind?: "ticket" | "reservation";
  deposit_amount?: number;
  balance_on_site?: boolean;
};

type Order = {
  id: string;
  order_number: string;
  buyer_name: string;
  buyer_email: string;
  total: number;
  status: string;
  created_at: string;
};

type RequestRow = {
  id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  status: "pending" | "ai_reviewing" | "approved" | "rejected" | "maybe";
  ai_decision: string | null;
  ai_score: number | null;
  ai_reasoning: string | null;
  created_at: string;
};

function EventDetail() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const nav = useNavigate();
  const { t } = useLang();
  const [ev, setEv] = useState<EventT | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const loadOwnerEvent = useServerFn(getEventForOwner);

  const reload = useCallback(async () => {
    const e = await loadOwnerEvent({ data: { eventId: id } });
    setEv((e as EventT | null) ?? null);
    const { data: tt } = await supabase.from("ticket_types").select("*").eq("event_id", id).order("sort_order");
    setTickets((tt as TicketType[]) ?? []);
    const { data: ords } = await supabase.from("orders").select("id,order_number,buyer_name,buyer_email,total,status,created_at").eq("event_id", id).order("created_at", { ascending: false });
    setOrders((ords as Order[]) ?? []);
    const { data: rqs } = await supabase
      .from("ticket_requests")
      .select("id,buyer_name,buyer_email,buyer_phone,instagram_url,facebook_url,status,ai_decision,ai_score,ai_reasoning,created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false });
    setRequests((rqs as RequestRow[]) ?? []);
    setLoading(false);
  }, [id, loadOwnerEvent]);

  useEffect(() => { reload(); }, [reload]);

  if (loading) return <p className="text-sm text-muted-foreground">{t("טוען…", "Loading…")}</p>;
  if (!ev) return <p>{t("האירוע לא נמצא.", "Event not found.")}</p>;

  async function save(patch: Partial<EventT>) {
    const { error } = await supabase.from("events").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(t("נשמר", "Saved")); reload(); }
  }

  async function togglePublish() {
    if (!ev) return;
    const next = ev.status === "published" ? "draft" : "published";
    if (next === "published" && tickets.length === 0) {
      toast.error(t("יש להוסיף לפחות סוג כרטיס אחד לפני פרסום", "Add at least one ticket type before publishing"));
      return;
    }
    await save({ status: next });
  }

  async function deleteEvent() {
    if (!confirm(t("למחוק את האירוע? לא ניתן לבטל פעולה זו.", "Delete this event? This cannot be undone."))) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("האירוע נמחק", "Event deleted"));
    nav({ to: "/events" });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground">
            <span className="inline-block rtl:rotate-180">←</span> {t("אירועים", "Events")}
          </Link>
          <h1 className="mt-2 text-3xl font-display tracking-tight">{ev.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs ${ev.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{ev.status === "published" ? t("פורסם", "published") : t("טיוטה", "draft")}</span>
            <span className="ms-2">/e/{ev.slug}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="rounded-full">
            <a href={`/e/${ev.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 me-1" /> {t("צפייה בדף", "View page")}</a>
          </Button>
          <Button onClick={togglePublish} className="rounded-full">
            {ev.status === "published" ? t("בטל פרסום", "Unpublish") : t("פרסם", "Publish")}
          </Button>
        </div>
      </div>

      <Tabs
        value={tab ?? "details"}
        onValueChange={(v) => nav({ to: "/events/$id", params: { id }, search: { tab: v }, replace: true })}
      >
        <TabsList>
          <TabsTrigger value="details">{t("פרטים", "Details")}</TabsTrigger>
          <TabsTrigger value="tickets">{t("כרטיסים", "Tickets")} ({tickets.length})</TabsTrigger>
          {ev.requires_approval && (
            <TabsTrigger value="requests">{t("בקשות", "Requests")} ({requests.length})</TabsTrigger>
          )}
          <TabsTrigger value="orders">{t("הזמנות", "Orders")} ({orders.length})</TabsTrigger>
          <TabsTrigger value="budget">{t("תקציב", "Budget")}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <DetailsForm event={ev} onSave={save} onDelete={deleteEvent} />
        </TabsContent>

        <TabsContent value="tickets" className="mt-6">
          <TicketsTab eventId={ev.id} tickets={tickets} reload={reload} currency={ev.currency} />
        </TabsContent>

        {ev.requires_approval && (
          <TabsContent value="requests" className="mt-6">
            <RequestsTab requests={requests} reload={reload} />
          </TabsContent>
        )}

        <TabsContent value="orders" className="mt-6">
          <OrdersTab orders={orders} currency={ev.currency} />
        </TabsContent>

        <TabsContent value="budget" className="mt-6">
          <EventBudgetTab eventId={ev.id} currency={ev.currency} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailsForm({ event, onSave, onDelete }: { event: EventT; onSave: (p: Partial<EventT>) => Promise<void>; onDelete: () => void }) {
  const [form, setForm] = useState(event);
  const { t, lang } = useLang();
  const [genBusy, setGenBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCircleLogo, setUploadingCircleLogo] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLang, setAiLang] = useState<"en" | "he">("en");
  const [aiBusy, setAiBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const { user } = useAuth();
  const genMeet = useServerFn(generateMeetLink);
  const genPage = useServerFn(generateEventPage);
  useEffect(() => setForm(event), [event]);

  // The org's restaurant booking venue — used when the event sells table bookings.
  const [venueSlug, setVenueSlug] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("reservation_settings").select("slug,enabled").maybeSingle();
      setVenueSlug(data?.slug ?? null);
    })();
  }, []);

  async function runAiGenerate() {
    if (!aiPrompt.trim()) { toast.error(t("תאר/י את האירוע קודם", "Describe your event first")); return; }
    setAiBusy(true);
    try {
      const res = await genPage({ data: { eventId: event.id, prompt: aiPrompt.trim(), language: aiLang } });
      const patch = {
        name: res.name || form.name,
        tagline: res.tagline,
        description: res.description,
        template: res.template,
      };
      setForm((f) => ({ ...f, ...patch }));
      await onSave(patch);
      toast.success(t("דף נחיתה נוצר", "Landing page generated"));
      setAiOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("יצירת AI נכשלה", "AI generation failed"));
    } finally {
      setAiBusy(false);
    }
  }

  async function generateMeet() {
    setGenBusy(true);
    try {
      const res = await genMeet({ data: { eventId: event.id } });
      setForm((f) => ({ ...f, online_url: res.url, meeting_provider: "google_meet", meeting_event_id: res.id }));
      toast.success(t("קישור Google Meet נוצר", "Google Meet link created"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("יצירת קישור Meet נכשלה", "Failed to create Meet link"));
    } finally {
      setGenBusy(false);
    }
  }

  async function handleCoverUpload(file: File) {
    if (!user) return;
    if (file.size > 8 * 1024 * 1024) { toast.error(t("התמונה חייבת להיות עד 8MB", "Image must be under 8MB")); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${event.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("event-media").upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("event-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error || !signed.data) throw signed.error ?? new Error(t("שגיאה ביצירת URL", "Could not sign URL"));
      setForm((f) => ({ ...f, cover_url: signed.data.signedUrl }));
      await onSave({ cover_url: signed.data.signedUrl });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("העלאה נכשלה", "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  async function handleCoverVideoUpload(file: File) {
    if (!user) return;
    if (file.size > 40 * 1024 * 1024) { toast.error(t("הסרטון חייב להיות עד 40MB", "Video must be under 40MB")); return; }
    setUploadingVideo(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/${event.id}/cover-video-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("event-media").upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("event-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error || !signed.data) throw signed.error ?? new Error(t("שגיאה ביצירת URL", "Could not sign URL"));
      setForm((f) => ({ ...f, cover_video_url: signed.data.signedUrl }));
      await onSave({ cover_video_url: signed.data.signedUrl });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("העלאה נכשלה", "Upload failed"));
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleLogoUpload(file: File) {
    if (!user) return;
    if (file.size > 4 * 1024 * 1024) { toast.error(t("הלוגו חייב להיות עד 4MB", "Logo must be under 4MB")); return; }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${event.id}/logo-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("event-media").upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("event-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error || !signed.data) throw signed.error ?? new Error(t("שגיאה ביצירת URL", "Could not sign URL"));
      setForm((f) => ({ ...f, logo_url: signed.data.signedUrl }));
      await onSave({ logo_url: signed.data.signedUrl });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("העלאה נכשלה", "Upload failed"));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleCircleLogoUpload(file: File) {
    if (!user) return;
    if (file.size > 4 * 1024 * 1024) { toast.error(t("הלוגו חייב להיות עד 4MB", "Logo must be under 4MB")); return; }
    setUploadingCircleLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${event.id}/circle-logo-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("event-media").upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("event-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error || !signed.data) throw signed.error ?? new Error(t("שגיאה ביצירת URL", "Could not sign URL"));
      setForm((f) => ({ ...f, circle_logo_url: signed.data.signedUrl }));
      await onSave({ circle_logo_url: signed.data.signedUrl });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("העלאה נכשלה", "Upload failed"));
    } finally {
      setUploadingCircleLogo(false);
    }
  }

  const urlSchema = z.string().trim().url(t("חייב להיות URL תקין", "Must be a valid URL")).max(2048);
  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    const name = (form.name ?? "").trim();
    if (!name) errs.name = t("שם הוא שדה חובה", "Name is required");
    else if (name.length > 120) errs.name = t("שם עד 120 תווים", "Name must be under 120 characters");
    if ((form.tagline ?? "").length > 200) errs.tagline = t("סלוגן עד 200 תווים", "Tagline must be under 200 characters");
    if ((form.description ?? "").length > 5000) errs.description = t("תיאור עד 5000 תווים", "Description must be under 5000 characters");

    if (form.event_type !== "virtual") {
      if (!(form.venue_name ?? "").trim()) errs.venue_name = t("שם מיקום נדרש לאירוע פיזי", "Venue name is required for in-person events");
    }
    if (form.event_type !== "physical") {
      const url = (form.online_url ?? "").trim();
      if (!url) errs.online_url = t("קישור מפגש נדרש לאירוע אונליין", "Meeting link is required for online events");
      else {
        const parsed = urlSchema.safeParse(url);
        if (!parsed.success) errs.online_url = parsed.error.issues[0]?.message ?? t("URL לא תקין", "Invalid URL");
      }
    }

    if (form.video_url && form.video_url.trim()) {
      const parsed = urlSchema.safeParse(form.video_url.trim());
      if (!parsed.success) errs.video_url = parsed.error.issues[0]?.message ?? t("URL לא תקין", "Invalid URL");
    }
    if (!form.start_at) errs.start_at = t("תאריך התחלה נדרש", "Start date is required");
    if (!form.end_at) errs.end_at = t("תאריך סיום נדרש", "End date is required");
    if (form.start_at && form.end_at) {
      const s = new Date(form.start_at).getTime();
      const e = new Date(form.end_at).getTime();
      if (Number.isNaN(s)) errs.start_at = t("תאריך התחלה לא תקין", "Invalid start date");
      if (Number.isNaN(e)) errs.end_at = t("תאריך סיום לא תקין", "Invalid end date");
      if (!Number.isNaN(s) && !Number.isNaN(e) && e <= s) {
        errs.end_at = t("הסיום חייב להיות אחרי ההתחלה", "End must be after start");
      }
    }
    return errs;
  }

  function handleSave() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error(t("אנא תקן/י את השדות המסומנים", "Please fix the highlighted fields"));
      return;
    }
    onSave({
      name: form.name.trim(),
      tagline: form.tagline?.trim() || null,
      description: form.description?.trim() || null,
      venue_name: form.venue_name?.trim() || null,
      venue_address: form.venue_address?.trim() || null,
      start_at: form.start_at,
      end_at: form.end_at,
      event_type: form.event_type,
      online_url: form.online_url?.trim() || null,
      meeting_provider: form.meeting_provider,
      template: form.template || "classic",
      schedule: (form.schedule ?? []).filter((s) => s && (s.title?.trim() || s.time?.trim())),
      highlights: (form.highlights ?? []).filter((h) => h && h.title?.trim()).slice(0, 6),
      video_url: form.video_url?.trim() || null,
      includes: (form.includes ?? []).filter((i) => i && i.text?.trim()).slice(0, 12),
      faq: (form.faq ?? []).filter((f) => f && f.question?.trim()).slice(0, 12),
      location_info: form.location_info ?? {},
      rules: (form.rules ?? []).filter((r) => typeof r === "string" && r.trim()).slice(0, 12),
      bg_color: form.bg_color?.trim() || null,
      text_color: form.text_color?.trim() || null,
      gallery: (form.gallery ?? []).filter((u) => typeof u === "string" && u.trim()).slice(0, 24),
      sections: mergeSectionsWithDefaults(form.sections ?? []),
      requires_approval: !!form.requires_approval,
      approval_criteria: form.approval_criteria?.trim() || null,
      visual_criteria: form.visual_criteria?.trim() || null,
      require_instagram: !!form.require_instagram,
      require_facebook: !!form.require_facebook,
      sale_mode: (form.sale_mode ?? "tickets") as SaleMode,
      booking_slug: form.sale_mode === "booking" ? (form.booking_slug?.trim() || venueSlug || null) : null,
      booking_deposit_enabled: !!form.booking_deposit_enabled,
      booking_deposit_per_guest: Number(form.booking_deposit_per_guest ?? 0),
      day_hours: form.day_hours ?? [],
    });
  }

  const steps = [
    { key: "basics", title: t("בסיס", "Basics"), hint: t("שם, פורמט, תאריכים", "Name, format, when") },
    { key: "where", title: form.event_type === "virtual" ? t("אונליין", "Online") : t("מיקום", "Where"), hint: form.event_type === "virtual" ? t("קישור מפגש", "Meeting link") : t("מיקום וקישור", "Venue & link") },
    { key: "story", title: t("סיפור", "Story"), hint: t("תמונה ותיאור", "Cover & description") },
  ];

  function next() {
    const errs = validate();
    setErrors(errs);
    // only block on this step's fields
    const stepKeys: Record<number, string[]> = {
      0: ["name", "start_at", "end_at"],
      1: ["venue_name", "online_url"],
      2: ["description", "tagline"],
    };
    const blocked = stepKeys[step].some((k) => errs[k]);
    if (blocked) { toast.error(t("אנא תקן/י את השדות המסומנים", "Please fix the highlighted fields")); return; }
    if (step < steps.length - 1) setStep(step + 1);
    else handleSave();
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <ol className="flex items-center gap-3">
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-3 flex-1">
            <button type="button" onClick={() => setStep(i)} className="flex items-center gap-2 group">
              <span className={`h-7 w-7 rounded-full grid place-items-center text-xs font-medium transition ${i < step ? "bg-black text-white" : i === step ? "bg-black text-white" : "bg-black/5 text-black/50"}`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={`text-sm ${i === step ? "font-medium" : "text-muted-foreground"}`}>{s.title}</span>
            </button>
            {i < steps.length - 1 && <span className="flex-1 h-px bg-black/10" />}
          </li>
        ))}
      </ol>

      <Card className="p-6 border-black/10">
        {step === 0 && (
          <div className="space-y-5 max-w-2xl">
            <Field label={t("שם האירוע", "Event name")} required error={errors.name}>
              <Input aria-invalid={!!errors.name} maxLength={120} placeholder={t("למשל: מסיבת גג קיץ", "e.g. Summer Rooftop Party")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <div>
              <Label className="mb-1.5 block">{t("פורמט", "Format")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["physical", "virtual", "hybrid"] as const).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setForm({ ...form, event_type: tp })}
                    className={`h-11 rounded-xl border text-sm capitalize transition ${form.event_type === tp ? "bg-black text-white border-black" : "border-black/15 hover:border-black/40"}`}
                  >{tp === "physical" ? t("פיזי", "In-person") : tp === "virtual" ? t("אונליין", "Online") : t("היברידי", "Hybrid")}</button>
                ))}
              </div>
            </div>
            <EventDaysField
              startAt={form.start_at}
              endAt={form.end_at}
              dayHours={form.day_hours ?? []}
              errors={{ start_at: errors.start_at, end_at: errors.end_at }}
              onChange={(p) => setForm({ ...form, ...p })}
            />

            {/* Attendee approval */}
            {/* Sale mode: tickets vs table booking */}
            <div className="rounded-2xl border border-black/10 p-5 bg-gradient-to-br from-amber-50 via-white to-emerald-50">
              <div className="font-medium text-sm">{t("מה מוכרים בדף האירוע?", "What does the event page sell?")}</div>
              <div className="mt-3 grid sm:grid-cols-2 gap-2">
                {([
                  { k: "tickets" as SaleMode, title: t("מכירת כרטיסים", "Ticket sales"), hint: t("סוגי כרטיסים, כמויות ותשלום מלא", "Ticket tiers, quantities and full payment") },
                  { k: "booking" as SaleMode, title: t("שמירת מקום (שולחנות)", "Table booking"), hint: t("בחירת סועדים, תאריך ושעה — כמו במסעדה", "Party size, date and time — like the restaurant module") },
                ]).map((o) => (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => setForm({ ...form, sale_mode: o.k })}
                    className={`text-start rounded-xl border p-3 transition ${(form.sale_mode ?? "tickets") === o.k ? "border-black bg-white shadow-sm" : "border-black/15 hover:border-black/40"}`}
                  >
                    <div className="text-sm font-medium">{o.title}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">{o.hint}</p>
                  </button>
                ))}
              </div>

              {(form.sale_mode ?? "tickets") === "booking" && (
                <div className="mt-4 space-y-3">
                  <Field label={t("קישור ישיר להזמנות", "Direct booking link")}>
                    <Input
                      placeholder={venueSlug ?? "my-venue"}
                      type="text"
                      dir="ltr"
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={form.booking_slug ?? venueSlug ?? ""}
                      onChange={(e) => setForm({
                        ...form,
                        booking_slug: e.currentTarget.value.toLowerCase().replace(/[\s/\\]+/g, "-").replace(/[^a-z0-9._-]/g, ""),
                      })}
                      className="text-left"
                    />
                  </Field>
                  <p className="text-xs text-muted-foreground" dir="ltr">/r/{form.booking_slug ?? venueSlug ?? "my-venue"}</p>
                  {!venueSlug && (
                    <p className="text-xs text-amber-700">
                      {t("לא נמצאו הגדרות שמירת מקום לעסק — הגדירו אותן במודול המסעדות.", "No reservation settings found for this business — set them up in the Reservations module.")}
                    </p>
                  )}
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-black/10 bg-white p-3">
                    <div>
                      <div className="text-sm font-medium">{t("גביית פיקדון", "Take a deposit")}</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("פיקדון בכרטיס אשראי לכל סועד. כבוי = שמירת מקום בלי תשלום.", "Credit-card deposit per guest. Off = booking with no payment.")}
                      </p>
                    </div>
                    <Switch
                      checked={!!form.booking_deposit_enabled}
                      onCheckedChange={(v) => setForm({ ...form, booking_deposit_enabled: v })}
                    />
                  </div>
                  {form.booking_deposit_enabled && (
                    <Field label={`${t("פיקדון לסועד", "Deposit per guest")} (${event.currency})`}>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={form.booking_deposit_per_guest ?? 0}
                        onChange={(e) => setForm({ ...form, booking_deposit_per_guest: Number(e.target.value) })}
                      />
                    </Field>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-black/10 p-5 bg-gradient-to-br from-fuchsia-50 via-white to-sky-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">{t("אישור משתתפים לפי פרופיל חברתי", "Attendee approval by social profile")}</div>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    {t("אורחים יגישו בקשה עם פרופיל אינסטגרם/פייסבוק. AI יסנן ראשונית לפי הקריטריונים שלך, ותוכל/י לאשר או לדחות ידנית. תשלום רק אחרי אישור.",
                       "Guests submit a request with an Instagram / Facebook profile. AI screens against your criteria; you approve or reject manually. Payment happens only after approval.")}
                  </p>
                </div>
                <Switch checked={!!form.requires_approval} onCheckedChange={(v) => setForm({ ...form, requires_approval: v })} />
              </div>
              {form.requires_approval && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!form.require_instagram} onChange={(e) => setForm({ ...form, require_instagram: e.target.checked })} />
                      {t("דרוש פרופיל אינסטגרם", "Require Instagram")}
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!form.require_facebook} onChange={(e) => setForm({ ...form, require_facebook: e.target.checked })} />
                      {t("דרוש פרופיל פייסבוק", "Require Facebook")}
                    </label>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">{t("קריטריונים לאישור (מה AI ישקול)", "Approval criteria (what AI should consider)")}</Label>
                    <textarea
                      rows={4}
                      maxLength={2000}
                      value={form.approval_criteria ?? ""}
                      onChange={(e) => setForm({ ...form, approval_criteria: e.target.value })}
                      placeholder={t("למשל: גילאים 21+, קהל ת\"א/נייטלייף, לא לאשר פרופילים ריקים או ספאמיים, להעדיף אמנים/יצרני תוכן. פרופילים דו-משמעיים לסמן 'לא בטוח'.",
                                     "e.g. Ages 21+, TLV nightlife crowd, reject empty or spammy profiles, prefer artists / creators. Mark ambiguous profiles as 'maybe'.")}
                      className="w-full rounded-md border border-input bg-white/80 px-3 py-2 text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {t("שים לב: ה-AI לא סורק את הפרופיל בפועל — הוא מחליט לפי ה-URL/שם משתמש והקריטריונים. פרופילים לא ברורים מסומנים 'לא בטוח' לאישור ידני.",
                         "Note: AI doesn't actually browse the profile — it decides from the URL/handle and your criteria. Ambiguous profiles are flagged 'maybe' for manual review.")}
                    </p>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">{t("קריטריונים ויזואליים (מה AI יחפש/יפסול בתמונות)", "Visual criteria (what AI should look for / reject in photos)")}</Label>
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={form.visual_criteria ?? ""}
                      onChange={(e) => setForm({ ...form, visual_criteria: e.target.value })}
                      placeholder={t("למשל: לבוש אלגנטי/סטייליסטי, אווירת נייטלייף, גילאי 25–40, לפסול תמונות אלימות/גזעניות, לא לאשר פרופילים ריקים או ילדותיים.",
                                     "e.g. Stylish / elegant looks, nightlife vibe, ages 25–40. Reject violent or racist imagery, empty or childish profiles.")}
                      className="w-full rounded-md border border-input bg-white/80 px-3 py-2 text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {t("AI יצלם את דף האינסטגרם/פייסבוק (רק פרופילים ציבוריים) וישווה לתיאור. פרופיל פרטי / חסום ייבדק לפי טקסט בלבד.",
                         "AI screenshots the public Instagram / Facebook page and compares it to your description. Private or blocked profiles fall back to text-only review.")}
                    </p>
                  </div>
                  <CriteriaTester criteria={form.approval_criteria ?? ""} visualCriteria={form.visual_criteria ?? ""} eventName={form.name ?? ""} />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 max-w-2xl">
            {form.event_type !== "virtual" && (
              <>
                <Field label={t("שם המיקום", "Venue name")} required error={errors.venue_name}><Input aria-invalid={!!errors.venue_name} placeholder={t("למשל: The Block", "e.g. The Block")} value={form.venue_name ?? ""} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} /></Field>
                <Field label={t("כתובת", "Address")}>
                  <AddressAutocomplete
                    placeholder={t("רחוב, עיר", "Street, city")}
                    value={form.venue_address ?? ""}
                    onChange={(v: string) => setForm({ ...form, venue_address: v })}
                    onSelect={(v: string) => setForm({ ...form, venue_address: v, location_info: { ...(form.location_info ?? {}), address: v } })}
                  />
                </Field>
              </>
            )}
            {form.event_type !== "physical" && (
              <div className="rounded-xl border border-black/10 p-4 bg-gradient-to-br from-pink-50 to-sky-50">
                <div className="flex items-center gap-2 text-sm font-medium"><Video className="h-4 w-4" /> {t("מפגש אונליין", "Online meeting")}</div>
                <div className="mt-3 grid sm:grid-cols-[1fr_auto] gap-2 items-start">
                  <Input
                    placeholder="https://meet.google.com/..."
                    aria-invalid={!!errors.online_url}
                    value={form.online_url ?? ""}
                    onChange={(e) => setForm({ ...form, online_url: e.target.value, meeting_provider: e.target.value ? (form.meeting_provider ?? "manual") : null })}
                  />
                  <Button type="button" variant="outline" className="rounded-full" disabled={genBusy} onClick={generateMeet}>
                    <Sparkles className="h-4 w-4 me-1" />{genBusy ? t("יוצר…", "Creating…") : t("צור Meet אוטומטית", "Auto-create Meet")}
                  </Button>
                </div>
                {errors.online_url && <p className="text-xs text-red-600 mt-2">{errors.online_url}</p>}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 max-w-2xl">
            <div className="rounded-2xl border border-black/10 bg-gradient-to-br from-pink-50 via-amber-50 to-sky-50 p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-black text-white grid place-items-center"><Sparkles className="h-4 w-4" /></div>
                  <div>
                    <div className="font-medium">{t("בנה דף נחיתה עם AI", "Build landing page with AI")}</div>
                    <div className="text-xs text-muted-foreground max-w-md">{t("תאר/י את האירוע בכמה מילים ו-AI יבחר טמפלייט ויכתוב כותרת, סלוגן ותיאור.", "Describe your event in a few words and AI will pick a template and write the headline, tagline and description for you.")}</div>
                  </div>
                </div>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setAiOpen((v) => !v)}>
                  {aiOpen ? t("סגור", "Close") : t("צור", "Generate")}
                </Button>
              </div>
              {aiOpen && (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-2">
                    {(["en", "he"] as const).map((l) => (
                      <button key={l} type="button" onClick={() => setAiLang(l)} className={`h-8 px-3 rounded-full text-xs border transition ${aiLang === l ? "bg-black text-white border-black" : "border-black/15 hover:border-black/40"}`}>
                        {l === "en" ? "English" : "עברית"}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={4}
                    maxLength={2000}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={aiLang === "he" ? "תאר/י את האירוע: סוג, קהל, מיקום, אווירה, ואומנים..." : "Describe your event: type, audience, location, vibe, lineup..."}
                    className="w-full rounded-md border border-input bg-white/70 px-3 py-2 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" className="rounded-full" onClick={() => setAiOpen(false)} disabled={aiBusy}>{t("ביטול", "Cancel")}</Button>
                    <Button type="button" className="rounded-full" onClick={runAiGenerate} disabled={aiBusy}>
                      <Sparkles className="h-4 w-4 me-1" />{aiBusy ? t("יוצר…", "Generating…") : t("צור דף", "Generate page")}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t("טיפ: סלוגן, תיאור וטמפלייט קיימים יוחלפו.", "Tip: existing tagline, description and template will be replaced.")}</p>
                </div>
              )}
            </div>
            <div>
              <Label className="mb-1.5 block">{t("טמפלייט דף", "Page template")}</Label>
              <p className="text-xs text-muted-foreground mb-3">{t("בחר/י איך ייראה דף האירוע הציבורי.", "Choose how the public event page is laid out.")}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {TEMPLATES.map((tpl) => {
                  const active = (form.template || "classic") === tpl.key;
                  return (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => { setForm({ ...form, template: tpl.key }); onSave({ template: tpl.key }); }}
                      className={`group text-start rounded-xl border overflow-hidden transition ${active ? "border-black ring-2 ring-black/10" : "border-black/10 hover:border-black/30"}`}
                    >
                      <div className="aspect-[4/5] bg-black/[0.03]"><TemplateThumb keyName={tpl.key} /></div>
                      <div className="px-3 py-2">
                        <div className="text-sm font-medium">{tpl.label}</div>
                        <div className="text-[11px] text-muted-foreground">{tpl.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">{t("רקע הדף", "Page background")}</Label>
              <p className="text-xs text-muted-foreground mb-3">{t("החלף את הרקע הדיפולטי של הטמפלייט. צבע הטקסט מתאים אוטומטית או בחר/י שלך.", "Override the template's default background. Text color adjusts automatically, or pick your own.")}</p>
              <BgColorPicker
                bg={form.bg_color ?? null}
                text={form.text_color ?? null}
                onChange={(p) => { setForm({ ...form, ...p }); onSave(p); }}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">{t("תמונת קאבר", "Cover image")}</Label>
              <div className="flex items-start gap-4">
                <div
                  className="relative w-48 h-32 rounded-xl border border-dashed border-black/15 bg-black/[0.02] overflow-hidden flex items-center justify-center text-xs text-muted-foreground"
                  style={form.cover_url ? { backgroundImage: `url(${form.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                >
                  {!form.cover_url && <span>{t("אין קאבר עדיין", "No cover yet")}</span>}
                  {form.logo_url && (
                    <img src={form.logo_url} alt="Logo preview" className="absolute inset-0 m-auto h-3/5 max-h-[80%] w-auto max-w-[70%] object-contain drop-shadow-lg" />
                  )}
                  {form.cover_url && (
                    <button type="button" onClick={() => { setForm({ ...form, cover_url: null }); onSave({ cover_url: null }); }} className="absolute top-1.5 end-1.5 h-6 w-6 rounded-full bg-white/90 hover:bg-white grid place-items-center shadow">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-black/15 hover:border-black/40 text-sm cursor-pointer">
                  <ImagePlus className="h-4 w-4" />
                  {uploading ? t("מעלה…", "Uploading…") : form.cover_url ? t("החלף", "Replace") : t("העלה", "Upload")}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ""; }} />
                </label>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">
                {t("סרטון בבאנר", "Banner video")}{" "}
                <span className="text-xs text-muted-foreground font-normal">{t("(אופציונלי, מתנגן אוטומטית ללא סאונד מעל הקאבר)", "(optional, autoplays muted over the cover)")}</span>
              </Label>
              <div className="flex items-start gap-4">
                <div className="relative w-48 h-32 rounded-xl border border-dashed border-black/15 bg-black/[0.02] overflow-hidden flex items-center justify-center text-xs text-muted-foreground">
                  {form.cover_video_url ? (
                    <>
                      <video src={form.cover_video_url} muted loop autoPlay playsInline className="h-full w-full object-cover" />
                      <button type="button" onClick={() => { setForm({ ...form, cover_video_url: null }); onSave({ cover_video_url: null }); }} className="absolute top-1.5 end-1.5 h-6 w-6 rounded-full bg-white/90 hover:bg-white grid place-items-center shadow">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : <span>{t("אין סרטון", "No video")}</span>}
                </div>
                <label className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-black/15 hover:border-black/40 text-sm cursor-pointer">
                  <ImagePlus className="h-4 w-4" />
                  {uploadingVideo ? t("מעלה…", "Uploading…") : form.cover_video_url ? t("החלף", "Replace") : t("העלה", "Upload")}
                  <input type="file" accept="video/mp4,video/webm" className="hidden" disabled={uploadingVideo} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverVideoUpload(f); e.target.value = ""; }} />
                </label>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">{t("לוגו על גבי הבאנר", "Logo over banner")} <span className="text-xs text-muted-foreground font-normal">{t("(אופציונלי, מוצג מעל תמונת הבאנר)", "(optional, shown over the banner image)")}</span></Label>
              <div className="flex items-start gap-4">
                <div className="relative w-32 h-32 rounded-xl border border-dashed border-black/15 bg-[conic-gradient(at_50%_50%,#0000_0_25%,#0001_0_50%,#0000_0_75%,#0001_0)] bg-[length:16px_16px] overflow-hidden flex items-center justify-center text-xs text-muted-foreground">
                  {form.logo_url ? (
                    <>
                      <img src={form.logo_url} alt="Logo" className="max-w-[80%] max-h-[80%] object-contain" />
                      <button type="button" onClick={() => { setForm({ ...form, logo_url: null }); onSave({ logo_url: null }); }} className="absolute top-1.5 end-1.5 h-6 w-6 rounded-full bg-white/90 hover:bg-white grid place-items-center shadow">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : <span>{t("אין לוגו", "No logo")}</span>}
                </div>
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-black/15 hover:border-black/40 text-sm cursor-pointer">
                    <ImagePlus className="h-4 w-4" />
                    {uploadingLogo ? t("מעלה…", "Uploading…") : form.logo_url ? t("החלף", "Replace") : t("העלה", "Upload")}
                    <input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" className="hidden" disabled={uploadingLogo} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ""; }} />
                  </label>
                  <p className="text-xs text-muted-foreground max-w-[220px]">{t("מומלץ PNG שקוף או SVG. מופיע מעל תמונת הבאנר.", "Transparent PNG or SVG recommended. Appears over the banner image.")}</p>
                </div>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">{t("לוגו בעיגול", "Circle logo")} <span className="text-xs text-muted-foreground font-normal">{t("(אופציונלי, עיגול לבן ממורכז בין הבאנר לכותרת)", "(optional, white circle between banner and title)")}</span></Label>
              <div className="flex items-start gap-4">
                <div className="relative w-32 h-32 rounded-full border border-dashed border-black/15 bg-white shadow-sm overflow-hidden flex items-center justify-center text-xs text-muted-foreground">
                  {form.circle_logo_url ? (
                    <>
                      <img src={form.circle_logo_url} alt="Circle logo" className="max-w-[78%] max-h-[78%] object-contain" />
                      <button type="button" onClick={() => { setForm({ ...form, circle_logo_url: null }); onSave({ circle_logo_url: null }); }} className="absolute top-1.5 end-1.5 h-6 w-6 rounded-full bg-white/90 hover:bg-white grid place-items-center shadow">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : <span>{t("אין לוגו", "No logo")}</span>}
                </div>
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-black/15 hover:border-black/40 text-sm cursor-pointer">
                    <ImagePlus className="h-4 w-4" />
                    {uploadingCircleLogo ? t("מעלה…", "Uploading…") : form.circle_logo_url ? t("החלף", "Replace") : t("העלה", "Upload")}
                    <input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" className="hidden" disabled={uploadingCircleLogo} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCircleLogoUpload(f); e.target.value = ""; }} />
                  </label>
                  <p className="text-xs text-muted-foreground max-w-[220px]">{t("מומלץ קובץ ריבועי. מוצג בעיגול לבן על גבול הבאנר.", "Square file recommended. Shown in a white circle on the banner edge.")}</p>
                </div>
              </div>
            </div>
            {(form.logo_url || form.circle_logo_url || form.cover_url || form.cover_video_url) && (
              <div className="rounded-2xl border border-black/10 p-4">
                <LogoPlacementEditor
                  coverUrl={form.cover_url}
                  coverVideoUrl={form.cover_video_url}
                  logoUrl={form.logo_url}
                  circleLogoUrl={form.circle_logo_url}
                  layout={form.logo_layout}
                  he={lang === "he"}
                  onChange={(next) => setForm((f) => ({ ...f, logo_layout: next }))}
                />
                <div className="mt-3 flex items-center gap-2">
                  <Button type="button" size="sm" onClick={() => onSave({ logo_layout: form.logo_layout })}>
                    {t("שמור מיקום", "Save placement")}
                  </Button>
                  <span className="text-xs text-muted-foreground">{t("שמור/י כדי להחיל על הדף הציבורי", "Save to apply on the public page")}</span>
                </div>
              </div>
            )}
            <Field label={t("סלוגן", "Tagline")} error={errors.tagline}><Input aria-invalid={!!errors.tagline} maxLength={200} placeholder={t("שורה אחת שמופיעה מתחת לכותרת", "One-liner shown under the title")} value={form.tagline ?? ""} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Field>
            <Field label={t("תיאור", "Description")} error={errors.description}>
              <textarea rows={6} maxLength={5000} aria-invalid={!!errors.description} placeholder={t("ספר/י על מה האירוע", "Tell people what this event is about")} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>

            <ExtrasEditor
              eventId={event.id}
              schedule={form.schedule ?? []}
              highlights={form.highlights ?? []}
              videoUrl={form.video_url ?? ""}
              videoError={errors.video_url}
              includes={form.includes ?? []}
              faq={form.faq ?? []}
              location={form.location_info ?? {}}
              rules={form.rules ?? []}
              gallery={form.gallery ?? []}
              sections={form.sections ?? []}
              userId={user?.id ?? null}
              onChange={(p) => setForm((f) => ({ ...f, ...p }))}
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-6 mt-6 border-t border-black/5">
          {step === 0 ? (
            <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={onDelete}><Trash2 className="h-4 w-4 me-1" /> {t("מחיקה", "Delete")}</Button>
          ) : (
            <Button variant="outline" className="rounded-full" onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4 me-1 rtl:rotate-180" /> {t("חזור", "Back")}</Button>
          )}
          <Button className="rounded-full" onClick={next}>
            {step < steps.length - 1 ? (<>{t("הבא", "Next")} <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" /></>) : t("שמור שינויים", "Save changes")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children, required, error }: { label: string; children: React.ReactNode; required?: boolean; error?: string }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}{required && <span className="text-red-600 ms-0.5">*</span>}</Label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function ExtrasEditor({
  eventId,
  schedule,
  highlights,
  videoUrl,
  videoError,
  includes,
  faq,
  location,
  rules,
  gallery,
  sections,
  userId,
  onChange,
}: {
  eventId: string;
  schedule: ScheduleItem[];
  highlights: HighlightItem[];
  videoUrl: string;
  videoError?: string;
  includes: IncludeItem[];
  faq: FaqItem[];
  location: LocationInfo;
  rules: string[];
  gallery: string[];
  sections: SectionEntry[];
  userId: string | null;
  onChange: (p: {
    schedule?: ScheduleItem[];
    highlights?: HighlightItem[];
    video_url?: string | null;
    includes?: IncludeItem[];
    faq?: FaqItem[];
    location_info?: LocationInfo;
    rules?: string[];
    gallery?: string[];
    sections?: SectionEntry[];
  }) => void;
}) {
  const [preview, setPreview] = useState(false);
  const { t, lang } = useLang();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteBusy, setPasteBusy] = useState(false);
  const [mergeMode, setMergeMode] = useState<"replace" | "append">("append");
  const parseFn = useServerFn(parseEventContent);
  const [pastePreview, setPastePreview] = useState<{
    includes: IncludeItem[];
    faq: FaqItem[];
    location: LocationInfo;
    rules: string[];
  } | null>(null);

  async function runParse() {
    if (!pasteText.trim()) { toast.error(t("הדבק/י טקסט קודם", "Paste some text first")); return; }
    setPasteBusy(true);
    try {
      const res = await parseFn({ data: { eventId, text: pasteText.trim() } });
      setPastePreview({
        includes: res.includes,
        faq: res.faq,
        location: res.location,
        rules: res.rules,
      });
      toast.success(t("תצוגה מקדימה מוכנה — בדוק/י והחל/י", "Preview ready — review and apply"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("ניתוח AI נכשל", "AI parse failed"));
    } finally {
      setPasteBusy(false);
    }
  }

  function applyPastePreview() {
    if (!pastePreview) return;
    const merge = mergeMode === "append";
    onChange({
      includes: merge ? [...includes, ...pastePreview.includes].slice(0, 12) : pastePreview.includes,
      faq: merge ? [...faq, ...pastePreview.faq].slice(0, 12) : pastePreview.faq,
      rules: merge ? [...rules, ...pastePreview.rules].slice(0, 12) : pastePreview.rules,
      location_info: merge ? { ...location, ...stripEmpty(pastePreview.location) } : pastePreview.location,
    });
    toast.success(t("הסקשנים הוחלו", "Sections applied"));
    setPastePreview(null);
    setPasteOpen(false);
    setPasteText("");
  }

  function addSchedule() {
    onChange({ schedule: [...schedule, { time: "", title: "", description: "" }] });
  }
  function patchSchedule(i: number, p: Partial<ScheduleItem>) {
    onChange({ schedule: schedule.map((s, idx) => (idx === i ? { ...s, ...p } : s)) });
  }
  function removeSchedule(i: number) {
    onChange({ schedule: schedule.filter((_, idx) => idx !== i) });
  }
  async function importScheduleFromExcel(file: File) {
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("empty");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
      const pick = (r: Record<string, unknown>, keys: string[]) => {
        for (const k of Object.keys(r)) {
          const nk = k.trim().toLowerCase();
          if (keys.some((x) => nk === x || nk.includes(x))) {
            const v = r[k];
            if (v != null && String(v).trim()) return String(v).trim();
          }
        }
        return "";
      };
      const items: ScheduleItem[] = rows
        .map((r) => ({
          time: pick(r, ["time", "שעה", "hour"]),
          title: pick(r, ["title", "כותרת", "name", "שם"]),
          description: pick(r, ["description", "desc", "notes", "note", "הערות", "הערה", "תיאור"]),
        }))
        .filter((s) => s.title || s.time);
      if (items.length === 0) { toast.error(t("לא נמצאו שורות בקובץ", "No rows found in file")); return; }
      onChange({ schedule: [...schedule, ...items] });
      toast.success(t(`יובאו ${items.length} שורות`, `Imported ${items.length} rows`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("ייבוא נכשל", "Import failed"));
    }
  }

  function addHighlight() {
    if (highlights.length >= 6) return;
    onChange({ highlights: [...highlights, { icon: "Sparkles", title: "", description: "" }] });
  }
  function patchHighlight(i: number, p: Partial<HighlightItem>) {
    onChange({ highlights: highlights.map((h, idx) => (idx === i ? { ...h, ...p } : h)) });
  }
  function removeHighlight(i: number) {
    onChange({ highlights: highlights.filter((_, idx) => idx !== i) });
  }

  function addInclude() {
    if (includes.length >= 12) return;
    onChange({ includes: [...includes, { icon: "Sparkles", text: "" }] });
  }
  function patchInclude(i: number, p: Partial<IncludeItem>) {
    onChange({ includes: includes.map((it, idx) => (idx === i ? { ...it, ...p } : it)) });
  }
  function removeInclude(i: number) {
    onChange({ includes: includes.filter((_, idx) => idx !== i) });
  }

  function addFaq() {
    if (faq.length >= 12) return;
    onChange({ faq: [...faq, { question: "", answer: "" }] });
  }
  function patchFaq(i: number, p: Partial<FaqItem>) {
    onChange({ faq: faq.map((f, idx) => (idx === i ? { ...f, ...p } : f)) });
  }
  function removeFaq(i: number) {
    onChange({ faq: faq.filter((_, idx) => idx !== i) });
  }

  function addRule() {
    if (rules.length >= 12) return;
    onChange({ rules: [...rules, ""] });
  }
  function patchRule(i: number, v: string) {
    onChange({ rules: rules.map((r, idx) => (idx === i ? v : r)) });
  }
  function removeRule(i: number) {
    onChange({ rules: rules.filter((_, idx) => idx !== i) });
  }

  function patchLocation(p: Partial<LocationInfo>) {
    onChange({ location_info: { ...location, ...p } });
  }

  // Sections order & enabled flags
  const orderedSections = mergeSectionsWithDefaults(sections);
  function updateSections(next: SectionEntry[]) {
    onChange({ sections: next });
  }
  function toggleSection(key: SectionKey) {
    updateSections(orderedSections.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)));
  }
  function moveSection(key: SectionKey, dir: -1 | 1) {
    const idx = orderedSections.findIndex((s) => s.key === key);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= orderedSections.length) return;
    const next = orderedSections.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    updateSections(next);
  }

  // Gallery upload
  const [uploadingGallery, setUploadingGallery] = useState(false);
  async function handleGalleryUpload(files: FileList | null) {
    if (!files || files.length === 0 || !userId) return;
    setUploadingGallery(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024) {
          toast.error(t("כל תמונה עד 8MB", "Each image up to 8MB"));
          continue;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${userId}/${eventId}/gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await supabase.storage.from("event-media").upload(path, file, { upsert: false, contentType: file.type });
        if (up.error) { toast.error(up.error.message); continue; }
        const signed = await supabase.storage.from("event-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        if (!signed.error && signed.data) urls.push(signed.data.signedUrl);
      }
      if (urls.length) onChange({ gallery: [...gallery, ...urls].slice(0, 24) });
    } finally {
      setUploadingGallery(false);
    }
  }
  function removeGalleryImage(i: number) {
    onChange({ gallery: gallery.filter((_, idx) => idx !== i) });
  }
  function moveGalleryImage(i: number, dir: -1 | 1) {
    const target = i + dir;
    if (target < 0 || target >= gallery.length) return;
    const next = gallery.slice();
    [next[i], next[target]] = [next[target], next[i]];
    onChange({ gallery: next });
  }

  return (
    <div className="space-y-5 pt-4 mt-4 border-t border-black/5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Label className="text-sm">{t("סקשנים נוספים", "Extra sections")} <span className="text-xs text-muted-foreground font-normal">{t("(הכל אופציונלי)", "(all optional)")}</span></Label>
          <p className="text-xs text-muted-foreground mt-0.5">{t("הדגשים, מה כלול, מיקום, תוכנייה, שאלות נפוצות, נהלים וסרטון — הכל אופציונלי.", "Highlights, what's included, location, schedule, FAQ, rules and a promo video — all optional.")}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setPreview((v) => !v)}>
          {preview ? t("הסתר תצוגה", "Hide preview") : t("תצוגה מקדימה", "Preview")}
        </Button>
      </div>

      {/* Sections manager: toggle & reorder */}
      <div className="rounded-2xl border border-black/10 p-4 bg-white">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-medium">{t("ניהול סקשנים", "Manage sections")}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{t("סדר את הסקשנים בדף האירוע. כבה/הפעל כל סקשן.", "Reorder sections on the event page. Toggle any section on/off.")}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => updateSections(DEFAULT_SECTIONS.map((s) => ({ ...s })))}>
            {t("איפוס", "Reset")}
          </Button>
        </div>
        <ul className="mt-3 divide-y divide-black/5 border border-black/10 rounded-xl overflow-hidden">
          {orderedSections.map((s, i) => (
            <li key={s.key} className={`flex items-center gap-2 px-3 py-2 ${s.enabled ? "bg-white" : "bg-black/[0.02]"}`}>
              <span className={`text-xs w-5 text-center tabular-nums ${s.enabled ? "text-muted-foreground" : "text-muted-foreground/60"}`}>{i + 1}</span>
              <span className={`flex-1 text-sm ${s.enabled ? "" : "text-muted-foreground line-through"}`}>{SECTION_LABELS[s.key][lang === "he" ? "he" : "en"]}</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(s.key, -1)} disabled={i === 0} aria-label={t("העלה", "Move up")}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(s.key, +1)} disabled={i === orderedSections.length - 1} aria-label={t("הורד", "Move down")}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleSection(s.key)} aria-label={s.enabled ? t("כבה", "Hide") : t("הפעל", "Show")}>
                {s.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground mt-2">{t("סקשן ריק (בלי תוכן) לא יופיע בדף — גם אם הוא מופעל כאן.", "Empty sections (with no content) don't appear on the page — even if enabled here.")}</p>
      </div>

      {/* Smart paste with AI */}
      <div className="rounded-2xl border border-black/10 p-4 bg-gradient-to-br from-pink-50 via-amber-50 to-sky-50">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-black text-white grid place-items-center"><Sparkles className="h-4 w-4" /></div>
            <div>
              <div className="font-medium">{t("הדבקה חכמה", "Smart paste")}</div>
              <div className="text-xs text-muted-foreground max-w-md">{t("הדבק/י תיאור ארוך (בכל שפה) ו-AI ימיין ל-מה כלול, מיקום, שאלות נפוצות ונהלים.", "Paste a long description (any language) and AI will sort it into Includes, Location, FAQ and Rules.")}</div>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setPasteOpen((v) => !v)}>
            {pasteOpen ? t("סגור", "Close") : t("הדבק וארגן", "Paste & organize")}
          </Button>
        </div>
        {pasteOpen && (
          <div className="mt-4 space-y-3">
            <textarea
              rows={8}
              maxLength={12000}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"הדבק/י כאן את כל הטקסט שכתבת בעבר על האירוע — מה כלול, איך מגיעים, שאלות נפוצות, נהלים…"}
              className="w-full rounded-md border border-input bg-white/70 px-3 py-2 text-sm leading-relaxed"
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-2">
                {(["append", "replace"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setMergeMode(m)} className={`h-8 px-3 rounded-full text-xs border transition ${mergeMode === m ? "bg-black text-white border-black" : "border-black/15 hover:border-black/40"}`}>
                    {m === "append" ? t("הוסף לקיים", "Add to existing") : t("החלף את הקיים", "Replace existing")}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => { setPasteOpen(false); setPastePreview(null); }} disabled={pasteBusy}>{t("ביטול", "Cancel")}</Button>
                <Button type="button" size="sm" className="rounded-full" onClick={runParse} disabled={pasteBusy}>
                  <Sparkles className="h-4 w-4 me-1" />{pasteBusy ? t("מארגן…", "Organizing…") : pastePreview ? t("הרץ AI שוב", "Re-run AI") : t("ארגן עם AI", "Organize with AI")}
                </Button>
              </div>
            </div>
            {pastePreview && (
              <div className="mt-4 rounded-xl border border-black/10 bg-white p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("תצוגה מקדימה — איך זה יופיע בדף הציבורי", "Preview — how it will appear on the public page")}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {mergeMode === "append" ? t("יתווסף לסקשנים הקיימים שלך.", "Will be added to your existing sections.") : t("יחליף את הסקשנים הקיימים שלך.", "Will replace your existing sections.")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setPastePreview(null)}>{t("בטל", "Discard")}</Button>
                    <Button type="button" size="sm" className="rounded-full" onClick={applyPastePreview}>
                      {mergeMode === "append" ? t("החל (הוסף)", "Apply (add)") : t("החל (החלף)", "Apply (replace)")}
                    </Button>
                  </div>
                </div>
                <EventExtras
                  data={{
                    includes: pastePreview.includes,
                    faq: pastePreview.faq,
                    location: pastePreview.location,
                    rules: pastePreview.rules,
                  }}
                  tone="light"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Highlights */}
      <div className="rounded-2xl border border-black/10 p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{t("הדגשים", "Highlights")} <span className="text-xs text-muted-foreground font-normal">({highlights.length}/6 {t("אייקונים", "icons")})</span></div>
          <Button type="button" variant="ghost" size="sm" onClick={addHighlight} disabled={highlights.length >= 6}>
            <Plus className="h-4 w-4 me-1" /> {t("הוסף", "Add")}
          </Button>
        </div>
        {highlights.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-2">{t("אין הדגשים עדיין. הוסף/י 4–6 אייקונים שמתארים מה מחכה למוזמנים.", "No highlights yet. Add 4–6 icons that describe what guests can expect.")}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {highlights.map((h, i) => (
              <div key={i} className="grid grid-cols-[140px_1fr_auto] gap-2 items-start">
                <IconPicker
                  value={h.icon ?? "Sparkles"}
                  onChange={(v) => patchHighlight(i, { icon: v })}
                  userId={userId}
                  scopeId={eventId}
                  className="w-full"
                />
                <div className="space-y-1.5">
                  <IconTextField placeholder={t("כותרת", "Title")} maxLength={60} value={h.title} onChange={(v) => patchHighlight(i, { title: v })} userId={userId} scopeId={eventId} />
                  <IconTextField placeholder={t("תיאור קצר (אופציונלי)", "Short description (optional)")} maxLength={140} value={h.description ?? ""} onChange={(v) => patchHighlight(i, { description: v })} userId={userId} scopeId={eventId} />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeHighlight(i)} aria-label={t("הסר הדגש", "Remove highlight")}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Includes */}
      <div className="rounded-2xl border border-black/10 p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{t("מה כלול", "What's included")} <span className="text-xs text-muted-foreground font-normal">({includes.length}/12)</span></div>
          <Button type="button" variant="ghost" size="sm" onClick={addInclude} disabled={includes.length >= 12}>
            <Plus className="h-4 w-4 me-1" /> {t("הוסף", "Add")}
          </Button>
        </div>
        {includes.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-2">{t("מה כרטיס מקנה — שתייה, אוכל, מוזיקה, חניה…", "List what the ticket gets you — drinks, food, music, parking…")}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {includes.map((it, i) => (
              <div key={i} className="grid grid-cols-[140px_1fr_auto] gap-2 items-center">
                <IconPicker
                  value={it.icon ?? "Sparkles"}
                  onChange={(v) => patchInclude(i, { icon: v })}
                  userId={userId}
                  scopeId={eventId}
                  className="w-full"
                />
                <IconTextField placeholder={t("למשל: כוס שתייה בכניסה", "e.g. Welcome drink on arrival")} maxLength={200} value={it.text} onChange={(v) => patchInclude(i, { text: v })} userId={userId} scopeId={eventId} />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeInclude(i)} aria-label={t("הסר", "Remove")}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Location */}
      <div className="rounded-2xl border border-black/10 p-4 bg-white">
        <div className="text-sm font-medium">{t("מיקום וגישה", "Location & access")}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{t("איפה זה קורה, איך מגיעים, חניה.", "Where it happens, how to get there, parking.")}</p>
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <Field label={t("כתובת", "Address")}>
            <AddressAutocomplete
              value={location.address ?? ""}
              onChange={(v: string) => patchLocation({ address: v })}
            />
          </Field>
          <Field label={t("קישור למפה", "Map URL")}><Input type="url" placeholder="https://maps.google.com/…" value={location.map_url ?? ""} onChange={(e) => patchLocation({ map_url: e.target.value })} /></Field>
          <Field label={t("חניה", "Parking")}>
            <textarea rows={2} maxLength={500} value={location.parking ?? ""} onChange={(e) => patchLocation({ parking: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label={t("תחבורה ציבורית", "Public transit")}>
            <textarea rows={2} maxLength={500} value={location.transit ?? ""} onChange={(e) => patchLocation({ transit: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("הערות", "Notes")}>
              <textarea rows={2} maxLength={500} value={location.notes ?? ""} onChange={(e) => patchLocation({ notes: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </Field>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="rounded-2xl border border-black/10 p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{t("תוכנייה", "Program / schedule")}</div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" asChild>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4 me-1" /> {t("ייבוא מאקסל", "Import Excel")}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importScheduleFromExcel(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={addSchedule}>
              <Plus className="h-4 w-4 me-1" /> {t("הוסף שורה", "Add row")}
            </Button>
          </div>
        </div>
        {schedule.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-2">{t("אין תוכנייה עדיין. הוסף/י שורה או ייבא/י מאקסל (עמודות: שעה, כותרת, הערות).", "No schedule yet. Add a row or import an Excel file (columns: time, title, notes).")}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {schedule.map((s, i) => (
              <div key={i} className="grid grid-cols-[110px_1fr_auto] gap-2 items-start">
                <Input placeholder="20:30" value={s.time ?? ""} onChange={(e) => patchSchedule(i, { time: e.target.value })} />
                <div className="space-y-1.5">
                  <Input placeholder={t("כותרת (למשל: פתיחת דלתות)", "Title (e.g. Doors open)")} maxLength={120} value={s.title} onChange={(e) => patchSchedule(i, { title: e.target.value })} />
                  <Input placeholder={t("הערות (אופציונלי)", "Notes (optional)")} maxLength={200} value={s.description ?? ""} onChange={(e) => patchSchedule(i, { description: e.target.value })} />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeSchedule(i)} aria-label={t("הסר שורה", "Remove row")}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="rounded-2xl border border-black/10 p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{t("שאלות נפוצות", "FAQ")} <span className="text-xs text-muted-foreground font-normal">({faq.length}/12)</span></div>
          <Button type="button" variant="ghost" size="sm" onClick={addFaq} disabled={faq.length >= 12}>
            <Plus className="h-4 w-4 me-1" /> {t("הוסף", "Add")}
          </Button>
        </div>
        {faq.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-2">{t("שאלות נפוצות — החזרים, קוד לבוש, כשרות, גיל, וכו׳.", "Frequently asked questions — refunds, dress code, kosher, age limit, etc.")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {faq.map((f, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-start">
                <div className="space-y-1.5">
                  <Input placeholder={t("שאלה", "Question")} maxLength={200} value={f.question} onChange={(e) => patchFaq(i, { question: e.target.value })} />
                  <textarea rows={2} maxLength={1200} placeholder={t("תשובה", "Answer")} value={f.answer} onChange={(e) => patchFaq(i, { answer: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeFaq(i)} aria-label={t("הסר שאלה", "Remove FAQ")}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="rounded-2xl border border-black/10 p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{t("נהלי האירוע", "Event rules")} <span className="text-xs text-muted-foreground font-normal">({rules.length}/12)</span></div>
          <Button type="button" variant="ghost" size="sm" onClick={addRule} disabled={rules.length >= 12}>
            <Plus className="h-4 w-4 me-1" /> {t("הוסף", "Add")}
          </Button>
        </div>
        {rules.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-2">{t("נקודות קצרות — מדיניות ביטול, ת.ז. בכניסה, כניסה מאוחרת, עישון, וכו׳.", "Short bullets — cancellation policy, ID at entry, late entry, smoking, etc.")}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {rules.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-start">
                <IconTextField placeholder={t("נהל קצר", "Short rule")} maxLength={280} value={r} onChange={(v) => patchRule(i, v)} userId={userId} scopeId={eventId} />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeRule(i)} aria-label={t("הסר נהל", "Remove rule")}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video */}
      <div className="rounded-2xl border border-black/10 p-4 bg-white">
        <div className="text-sm font-medium">{t("סרטון קידום", "Promo video")}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{t("הדבק/י קישור YouTube, Vimeo או MP4.", "Paste a YouTube, Vimeo, or direct MP4 URL.")}</p>
        <div className="mt-2">
          <Input
            type="url"
            placeholder="https://youtube.com/watch?v=…"
            aria-invalid={!!videoError}
            value={videoUrl}
            onChange={(e) => onChange({ video_url: e.target.value })}
          />
          {videoError && <p className="text-xs text-red-600 mt-1">{videoError}</p>}
        </div>
      </div>

      {/* Gallery */}
      <div className="rounded-2xl border border-black/10 p-4 bg-white">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="text-sm font-medium">{t("גלריה", "Gallery")} <span className="text-xs text-muted-foreground font-normal">({gallery.length}/24)</span></div>
            <p className="text-xs text-muted-foreground mt-0.5">{t("העלה תמונות שמופיעות בגלריה בדף האירוע.", "Upload images to show in a gallery on the event page.")}</p>
          </div>
          <label className={`inline-flex items-center gap-2 h-9 px-4 rounded-full border text-sm cursor-pointer ${uploadingGallery ? "opacity-60" : "border-black/15 hover:border-black/40"}`}>
            <ImageIcon className="h-4 w-4" />
            {uploadingGallery ? t("מעלה…", "Uploading…") : t("הוסף תמונות", "Add images")}
            <input type="file" multiple accept="image/*" className="hidden" disabled={uploadingGallery || gallery.length >= 24} onChange={(e) => { handleGalleryUpload(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
        {gallery.length > 0 && (
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {gallery.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-black/10 bg-black/5 group">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-between p-1 opacity-0 group-hover:opacity-100">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveGalleryImage(i, -1)} disabled={i === 0} className="h-6 w-6 rounded bg-white/90 text-black grid place-items-center text-xs disabled:opacity-40" aria-label={t("הזז שמאלה", "Move left")}>‹</button>
                    <button type="button" onClick={() => moveGalleryImage(i, +1)} disabled={i === gallery.length - 1} className="h-6 w-6 rounded bg-white/90 text-black grid place-items-center text-xs disabled:opacity-40" aria-label={t("הזז ימינה", "Move right")}>›</button>
                  </div>
                  <button type="button" onClick={() => removeGalleryImage(i)} className="h-6 w-6 rounded bg-red-600 text-white grid place-items-center" aria-label={t("מחק", "Delete")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <div className="rounded-2xl border border-dashed border-black/15 p-5 bg-[#fafafa]">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">{t("תצוגה חיה", "Live preview")}</div>
          <EventExtras
            data={{ schedule, highlights, video_url: videoUrl, includes, faq, location, rules, gallery }}
            order={orderedSections}
            tone="light"
          />
        </div>
      )}
    </div>
  );
}

function stripEmpty<T extends Record<string, string | undefined>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in obj) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) out[k] = v;
  }
  return out;
}

function TicketsTab({ eventId, tickets, reload, currency }: { eventId: string; tickets: TicketType[]; reload: () => void; currency: string }) {
  const { t } = useLang();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: 0,
    quantity_total: 100,
    description: "",
    kind: "ticket" as "ticket" | "reservation",
    deposit_amount: 0,
    balance_on_site: true,
  });

  async function create() {
    if (!form.name) return toast.error(t("שם נדרש", "Name required"));
    const { error } = await supabase.from("ticket_types").insert({
      event_id: eventId,
      name: form.name,
      price: form.price,
      quantity_total: form.quantity_total,
      description: form.description || null,
      sort_order: tickets.length,
      kind: form.kind,
      deposit_amount: form.kind === "reservation" ? form.deposit_amount : 0,
      balance_on_site: form.kind === "reservation" ? form.balance_on_site : false,
    });
    if (error) return toast.error(error.message);
    setForm({ name: "", price: 0, quantity_total: 100, description: "", kind: "ticket", deposit_amount: 0, balance_on_site: true });
    setCreating(false);
    reload();
  }

  async function patch(id: string, p: Partial<TicketType>) {
    const { error } = await supabase.from("ticket_types").update(p).eq("id", id);
    if (error) toast.error(error.message); else reload();
  }

  async function remove(id: string) {
    if (!confirm(t("למחוק סוג כרטיס?", "Delete ticket type?"))) return;
    const { error } = await supabase.from("ticket_types").delete().eq("id", id);
    if (error) toast.error(error.message); else reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating((v) => !v)} className="rounded-full"><Plus className="h-4 w-4 me-1" /> {t("הוסף סוג כרטיס", "Add ticket type")}</Button>
      </div>
      {creating && (
        <Card className="p-5 border-black/10 grid sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-4">
            <Label className="text-xs">{t("סוג מכירה", "Sale mode")}</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 max-w-md">
              {([
                { k: "ticket" as const, he: "רכישת כרטיס", en: "Ticket purchase" },
                { k: "reservation" as const, he: "שמירת מקום + פיקדון", en: "Reservation + deposit" },
              ]).map((o) => (
                <button
                  key={o.k}
                  type="button"
                  onClick={() => setForm({ ...form, kind: o.k })}
                  className={`h-10 rounded-full border text-sm transition ${form.kind === o.k ? "bg-foreground text-background border-foreground" : "border-black/15 hover:border-black/40"}`}
                >{t(o.he, o.en)}</button>
              ))}
            </div>
            {form.kind === "reservation" && (
              <p className="text-xs text-muted-foreground mt-2">
                {t("האורח משלם פיקדון בכרטיס אשראי כדי לשמור מקום, והיתרה נגבית במקום.", "The guest pays a card deposit to hold the spot; the balance is charged on site.")}
              </p>
            )}
          </div>
          <Field label={t("שם", "Name")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label={`${form.kind === "reservation" ? t("מחיר מלא", "Full price") : t("מחיר", "Price")} (${currency})`}><Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
          {form.kind === "reservation" && (
            <Field label={`${t("פיקדון עכשיו", "Deposit now")} (${currency})`}>
              <Input type="number" min={0} step="0.01" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: Number(e.target.value) })} />
            </Field>
          )}
          <Field label={t("כמות", "Quantity")}><Input type="number" min={0} value={form.quantity_total} onChange={(e) => setForm({ ...form, quantity_total: Number(e.target.value) })} /></Field>
          <Button onClick={create} className="rounded-full">{t("צור", "Create")}</Button>
          <div className="sm:col-span-4"><Field label={t("תיאור", "Description")}><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
          {form.kind === "reservation" && (
            <div className="sm:col-span-4 flex items-center gap-2">
              <Switch checked={form.balance_on_site} onCheckedChange={(v) => setForm({ ...form, balance_on_site: v })} />
              <span className="text-xs text-muted-foreground">{t("היתרה נגבית במקום בכרטיס אשראי", "Remaining balance charged on site by card")}</span>
            </div>
          )}
        </Card>
      )}
      {tickets.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-black/15 text-sm text-muted-foreground">{t("אין עדיין סוגי כרטיסים. הוסף/י אחד כדי להתחיל למכור.", "No ticket types yet. Add one to start selling.")}</Card>
      ) : (
        <Card className="border-black/10 divide-y divide-black/5">
          {tickets.map((tp) => (
            <div key={tp.id} className="p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[180px]">
                <Input value={tp.name} onChange={(e) => patch(tp.id, { name: e.target.value })} className="font-medium border-transparent hover:border-input" />
                {tp.description && <p className="text-xs text-muted-foreground mt-0.5 px-3">{tp.description}</p>}
                <div className="mt-1 px-3 flex items-center gap-2">
                  {([
                    { k: "ticket" as const, he: "כרטיס", en: "Ticket" },
                    { k: "reservation" as const, he: "שמירת מקום", en: "Reservation" },
                  ]).map((o) => (
                    <button
                      key={o.k}
                      type="button"
                      onClick={() => patch(tp.id, o.k === "reservation"
                        ? { kind: o.k, deposit_amount: Number(tp.deposit_amount) || 0, balance_on_site: true }
                        : { kind: o.k, deposit_amount: 0, balance_on_site: false })}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition ${(tp.kind ?? "ticket") === o.k ? "bg-foreground text-background border-foreground" : "border-black/15 text-muted-foreground hover:border-black/40"}`}
                    >{t(o.he, o.en)}</button>
                  ))}
                </div>
              </div>
              <div className="w-28">
                <Label className="text-xs">{(tp.kind ?? "ticket") === "reservation" ? t("מחיר מלא", "Full price") : t("מחיר", "Price")} ({currency})</Label>
                <Input type="number" min={0} step="0.01" value={tp.price} onChange={(e) => patch(tp.id, { price: Number(e.target.value) })} />
              </div>
              {(tp.kind ?? "ticket") === "reservation" && (
                <div className="w-28">
                  <Label className="text-xs">{t("פיקדון", "Deposit")} ({currency})</Label>
                  <Input type="number" min={0} step="0.01" value={Number(tp.deposit_amount) || 0} onChange={(e) => patch(tp.id, { deposit_amount: Number(e.target.value) })} />
                </div>
              )}
              <div className="w-36">
                <Label className="text-xs">{t("נמכר / סה״כ", "Sold / Total")}</Label>
                <div className="text-sm h-9 flex items-center gap-1">
                  <span className="font-medium">{tp.quantity_sold}</span>
                  <span className="text-muted-foreground">/</span>
                  <Input type="number" min={0} value={tp.quantity_total} onChange={(e) => patch(tp.id, { quantity_total: Number(e.target.value) })} className="w-20 h-8" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={tp.is_active} onCheckedChange={(v) => patch(tp.id, { is_active: v })} />
                <span className="text-xs text-muted-foreground">{tp.is_active ? t("פעיל", "Active") : t("כבוי", "Off")}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(tp.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function OrdersTab({ orders, currency }: { orders: Order[]; currency: string }) {
  const { t } = useLang();
  if (orders.length === 0) return <Card className="p-8 text-center border-dashed border-black/15 text-sm text-muted-foreground">{t("אין עדיין הזמנות.", "No orders yet.")}</Card>;
  return (
    <Card className="border-black/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-black/[0.03] text-start">
          <tr>
            <th className="px-4 py-2">{t("מספר הזמנה", "Order #")}</th>
            <th className="px-4 py-2">{t("קונה", "Buyer")}</th>
            <th className="px-4 py-2">{t("סה״כ", "Total")}</th>
            <th className="px-4 py-2">{t("סטטוס", "Status")}</th>
            <th className="px-4 py-2">{t("תאריך", "Date")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="px-4 py-2 font-mono text-xs">{o.order_number}</td>
              <td className="px-4 py-2">{o.buyer_name}<div className="text-xs text-muted-foreground">{o.buyer_email}</div></td>
              <td className="px-4 py-2">{currency} {Number(o.total).toLocaleString()}</td>
              <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${o.status === "paid" ? "bg-emerald-100 text-emerald-700" : o.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}`}>{o.status === "paid" ? t("שולם", "paid") : o.status === "pending" ? t("ממתין", "pending") : o.status}</span></td>
              <td className="px-4 py-2 text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

const BG_PRESETS: { label: string; bg: string; text: string }[] = [
  { label: "White", bg: "#ffffff", text: "#0a0a0a" },
  { label: "Cream", bg: "#fbf7f1", text: "#1a1410" },
  { label: "Sand", bg: "#efe7da", text: "#1a1410" },
  { label: "Mint", bg: "#e7f5ec", text: "#0f2a18" },
  { label: "Sky", bg: "#e6f1ff", text: "#0b1d3a" },
  { label: "Blush", bg: "#fde8ef", text: "#3a0b1d" },
  { label: "Black", bg: "#0a0a0a", text: "#fafafa" },
  { label: "Midnight", bg: "#0b1226", text: "#fafafa" },
];

function readableTextOn(bgHex: string): string {
  try {
    const h = bgHex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? "#0a0a0a" : "#fafafa";
  } catch { return "#0a0a0a"; }
}

function BgColorPicker({
  bg, text, onChange,
}: {
  bg: string | null;
  text: string | null;
  onChange: (p: { bg_color: string | null; text_color: string | null }) => void;
}) {
  const { t } = useLang();
  const activePreset = BG_PRESETS.find((p) => p.bg.toLowerCase() === (bg ?? "").toLowerCase());
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange({ bg_color: null, text_color: null })}
          className={`h-10 px-3 rounded-full text-xs border transition ${!bg ? "bg-black text-white border-black" : "border-black/15 hover:border-black/40"}`}
        >
          {t("ברירת מחדל של הטמפלייט", "Template default")}
        </button>
        {BG_PRESETS.map((p) => {
          const active = activePreset?.bg === p.bg;
          return (
            <button
              key={p.bg}
              type="button"
              onClick={() => onChange({ bg_color: p.bg, text_color: p.text })}
              className={`h-10 pe-3 ps-1 rounded-full text-xs border inline-flex items-center gap-2 transition ${active ? "border-black ring-2 ring-black/10" : "border-black/15 hover:border-black/40"}`}
              title={p.label}
            >
              <span className="h-8 w-8 rounded-full border border-black/10" style={{ background: p.bg }} />
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-black/5">
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          {t("רקע מותאם", "Custom background")}
          <input
            type="color"
            value={bg ?? "#ffffff"}
            onChange={(e) => onChange({ bg_color: e.target.value, text_color: text ?? readableTextOn(e.target.value) })}
            className="h-8 w-10 rounded border border-black/10 bg-white cursor-pointer"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          {t("צבע טקסט", "Text color")}
          <input
            type="color"
            value={text ?? "#0a0a0a"}
            onChange={(e) => onChange({ bg_color: bg, text_color: e.target.value })}
            className="h-8 w-10 rounded border border-black/10 bg-white cursor-pointer"
            disabled={!bg}
          />
        </label>
      </div>
    </div>
  );
}
function StatusPill({ status }: { status: RequestRow["status"] }) {
  const map: Record<RequestRow["status"], { cls: string; label: { he: string; en: string } }> = {
    pending: { cls: "bg-gray-100 text-gray-700", label: { he: "ממתין", en: "pending" } },
    ai_reviewing: { cls: "bg-sky-100 text-sky-700", label: { he: "AI בודק", en: "AI reviewing" } },
    approved: { cls: "bg-emerald-100 text-emerald-700", label: { he: "אושר", en: "approved" } },
    rejected: { cls: "bg-red-100 text-red-700", label: { he: "נדחה", en: "rejected" } },
    maybe: { cls: "bg-amber-100 text-amber-800", label: { he: "לא בטוח", en: "maybe" } },
  };
  const { t } = useLang();
  const m = map[status];
  return <span className={`px-2 py-0.5 rounded-full text-xs ${m.cls}`}>{t(m.label.he, m.label.en)}</span>;
}

function RequestsTab({ requests, reload }: { requests: RequestRow[]; reload: () => Promise<void> }) {
  const { t } = useLang();
  const [filter, setFilter] = useState<"maybe" | "approved" | "rejected" | "pending" | "all">("maybe");
  const [busy, setBusy] = useState<string | null>(null);
  const decide = useServerFn(decideTicketRequest);
  const rescreen = useServerFn(rescreenTicketRequest);

  const counts = {
    maybe: requests.filter((r) => r.status === "maybe").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    pending: requests.filter((r) => r.status === "pending" || r.status === "ai_reviewing").length,
    all: requests.length,
  };
  const filtered = requests.filter((r) => {
    if (filter === "all") return true;
    if (filter === "pending") return r.status === "pending" || r.status === "ai_reviewing";
    return r.status === filter;
  });

  async function act(id: string, decision: "approved" | "rejected") {
    setBusy(id + decision);
    try {
      await decide({ data: { requestId: id, decision } });
      toast.success(decision === "approved" ? t("אושר", "Approved") : t("נדחה", "Rejected"));
      await reload();
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

  if (requests.length === 0) {
    return <Card className="p-8 text-center border-dashed border-black/15 text-sm text-muted-foreground">{t("עדיין אין בקשות. שתפ/י את קישור האירוע כדי לקבל בקשות לאישור.", "No requests yet. Share your event link to start receiving approval requests.")}</Card>;
  }

  const tabs: { key: typeof filter; label: string; count: number }[] = [
    { key: "maybe", label: t("לא בטוח", "Maybe"), count: counts.maybe },
    { key: "pending", label: t("ממתין ל-AI", "Awaiting AI"), count: counts.pending },
    { key: "approved", label: t("אושרו", "Approved"), count: counts.approved },
    { key: "rejected", label: t("נדחו", "Rejected"), count: counts.rejected },
    { key: "all", label: t("הכל", "All"), count: counts.all },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setFilter(tb.key)}
            className={`h-8 px-3 rounded-full text-xs border transition ${filter === tb.key ? "bg-black text-white border-black" : "border-black/15 hover:border-black/40"}`}
          >
            {tb.label} <span className={filter === tb.key ? "opacity-70" : "text-muted-foreground"}>({tb.count})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-black/15 text-sm text-muted-foreground">{t("אין בקשות בקטגוריה זו.", "No requests in this category.")}</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id} className="p-4 border-black/10">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{r.buyer_name}</div>
                    <StatusPill status={r.status} />
                    {typeof r.ai_score === "number" && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/[0.04] text-muted-foreground">AI {r.ai_score}%</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.buyer_email}{r.buyer_phone ? ` · ${r.buyer_phone}` : ""}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {r.instagram_url && (
                      <a href={r.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-black/10 hover:bg-black/[0.03]">
                        Instagram ↗
                      </a>
                    )}
                    {r.facebook_url && (
                      <a href={r.facebook_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-black/10 hover:bg-black/[0.03]">
                        Facebook ↗
                      </a>
                    )}
                    <span className="text-muted-foreground self-center">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  {r.ai_reasoning && (
                    <p className="mt-2 text-xs text-muted-foreground italic max-w-xl leading-relaxed">"{r.ai_reasoning}"</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" disabled={busy === r.id + "rescreen"} onClick={() => rerun(r.id)}>
                    <Sparkles className="h-3.5 w-3.5 me-1" /> {t("הרץ AI מחדש", "Re-run AI")}
                  </Button>
                  {r.status !== "approved" && (
                    <Button variant="outline" size="sm" disabled={busy === r.id + "approved"} onClick={() => act(r.id, "approved")}>
                      <Check className="h-3.5 w-3.5 me-1" /> {t("אשר", "Approve")}
                    </Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" disabled={busy === r.id + "rejected"} onClick={() => act(r.id, "rejected")}>
                      <X className="h-3.5 w-3.5 me-1" /> {t("דחה", "Reject")}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
