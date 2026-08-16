import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, Minus, Plus, Video } from "lucide-react";
import { CheckoutDialog, type CheckoutItem } from "@/components/checkout/CheckoutDialog";
import { RequestDialog, type RequestTicket } from "@/components/checkout/RequestDialog";
import { EventExtras, type ScheduleItem, type HighlightItem, type IncludeItem, type FaqItem, type LocationInfo, type SectionEntry } from "@/components/event/EventExtras";
import { useIsMobile } from "@/hooks/use-mobile";
import { bannerLogoStyle, circleLogoStyle, defaultBannerSpot, defaultCircleSpot, readSpot, readOverlay, overlayBackground, type LogoLayout } from "@/components/event/logo-placement";

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
  day_hours: { date: string; start: string; end: string; closed?: boolean }[] | null;
  cover_url: string | null;
  cover_video_url: string | null;
  logo_url: string | null;
  circle_logo_url: string | null;
  logo_layout: LogoLayout | null;
  currency: string;
  status: string;
  event_type: "physical" | "virtual" | "hybrid";
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
  require_instagram: boolean;
  require_facebook: boolean;
  sale_mode?: "tickets" | "booking" | null;
  booking_slug?: string | null;
};
type TicketType = {
  id: string; name: string; description: string | null;
  price: number; quantity_total: number; quantity_sold: number;
  is_active: boolean; min_per_order: number; max_per_order: number;
  kind?: "ticket" | "reservation" | null;
  deposit_amount?: number | null;
  balance_on_site?: boolean | null;
};

function SafeLogo({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: CSSProperties }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <img src={src} alt={alt} className={className} style={style} onError={() => setOk(false)} />;
}

function isDarkColor(hex: string | null): boolean | null {
  if (!hex) return null;
  const h = hex.replace("#", "");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}

export const Route = createFileRoute("/e/$slug/")({ component: PublicEvent });

function PublicEvent() {
  const { slug } = Route.useParams();
  const [ev, setEv] = useState<EventT | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: e } = await supabase.from("events").select("id,slug,name,tagline,description,venue_name,venue_address,start_at,end_at,day_hours,cover_url,cover_video_url,logo_url,circle_logo_url,logo_layout,currency,status,event_type,template,schedule,highlights,video_url,includes,faq,location_info,rules,bg_color,text_color,sections,gallery,requires_approval,require_instagram,require_facebook,sale_mode,booking_slug").eq("slug", slug).maybeSingle();
      setEv(e as EventT | null);
      if (e) {
        const { data: tt } = await supabase.from("ticket_types").select("*").eq("event_id", e.id).eq("is_active", true).order("sort_order");
        setTickets((tt as TicketType[]) ?? []);
      }
      setLoading(false);
    })();
  }, [slug]);

  const chargeUnit = (t: TicketType) =>
    t.kind === "reservation" ? Number(t.deposit_amount ?? 0) : Number(t.price);
  const total = useMemo(() => tickets.reduce((sum, t) => sum + (qty[t.id] ?? 0) * chargeUnit(t), 0), [tickets, qty]);
  const itemCount = useMemo(() => Object.values(qty).reduce((a, b) => a + b, 0), [qty]);

  function adjust(t: TicketType, delta: number) {
    setQty((q) => {
      const current = q[t.id] ?? 0;
      const remaining = t.quantity_total - t.quantity_sold;
      const next = Math.max(0, Math.min(remaining, t.max_per_order, current + delta));
      return { ...q, [t.id]: next };
    });
  }

  function checkout() {
    if (itemCount === 0 || !ev) return;
    if (ev.requires_approval) setRequestOpen(true);
    else setCheckoutOpen(true);
  }

  const checkoutItems: CheckoutItem[] = useMemo(
    () => tickets
      .map((t) => ({
        tt: {
          id: t.id,
          name: t.name,
          price: Number(t.price),
          quantity_sold: t.quantity_sold,
          kind: (t.kind ?? "ticket") as "ticket" | "reservation",
          deposit_amount: Number(t.deposit_amount ?? 0),
          balance_on_site: !!t.balance_on_site,
        },
        quantity: qty[t.id] ?? 0,
      }))
      .filter((x) => x.quantity > 0),
    [tickets, qty],
  );

  const requestTickets: RequestTicket[] = useMemo(
    () => tickets.map((t) => ({ id: t.id, name: t.name, price: Number(t.price) })),
    [tickets],
  );

  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (!ev || ev.status !== "published") {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-display">Event unavailable</h1>
          <p className="mt-2 text-muted-foreground">This event isn't published or doesn't exist.</p>
          <Link to="/" className="mt-4 inline-block underline">← Back home</Link>
        </div>
      </div>
    );
  }

  const urlTpl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tpl") : null;
  const template = ((urlTpl ?? ev.template ?? "classic") as TemplateKey);
  const he = /[\u0590-\u05FF]/.test(`${ev.name} ${ev.tagline ?? ""} ${ev.description ?? ""}`);
  const tx = (h: string, e: string) => (he ? h : e);
  const ticketCard = (
    <Card className="p-5 border-black/10 shadow-sm bg-white text-foreground">
      <h2 className="font-display text-xl">{tx("כרטיסים", "Tickets")}</h2>
      <div className="mt-4 space-y-3">
        {tickets.length === 0 && <p className="text-sm text-muted-foreground">{tx("המכירה עוד לא נפתחה.", "Sales not open yet.")}</p>}
        {tickets.map((t) => {
          const remaining = t.quantity_total - t.quantity_sold;
          const soldOut = remaining <= 0;
          const isRes = t.kind === "reservation";
          return (
            <div key={t.id} className="border border-black/10 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{t.name}</div>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  {isRes ? (
                    <div className="mt-1">
                      <div className="text-sm">
                        {ev.currency} {Number(t.deposit_amount ?? 0).toLocaleString()} <span className="text-xs text-muted-foreground">{tx("פיקדון עכשיו", "deposit now")}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ev.currency} {Number(t.price).toLocaleString()} {tx("סה״כ", "total")}
                        {t.balance_on_site ? tx(" · היתרה משולמת במקום בכרטיס אשראי", " · balance paid on site by card") : ""}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm mt-1">{ev.currency} {Number(t.price).toLocaleString()}</div>
                  )}
                </div>
                {soldOut ? (
                  <span className="text-xs text-muted-foreground">{tx("אזל המלאי", "Sold out")}</span>
                ) : (
                  <div className="inline-flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => adjust(t, -1)}><Minus className="h-3.5 w-3.5" /></Button>
                    <span className="w-5 text-center text-sm">{qty[t.id] ?? 0}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => adjust(t, +1)}><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 pt-4 border-t border-black/5 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {he ? `${itemCount} כרטיסים` : `${itemCount} ticket${itemCount === 1 ? "" : "s"}`}
          {checkoutItems.some((x) => x.tt.kind === "reservation") && <span className="block text-xs">{tx("לחיוב עכשיו", "charged now")}</span>}
        </div>
        <div className="font-display text-lg">{ev.currency} {total.toLocaleString()}</div>
      </div>
      <Button disabled={ev.requires_approval ? false : itemCount === 0} onClick={ev.requires_approval ? () => setRequestOpen(true) : checkout} className="mt-4 w-full h-11 rounded-full">
        {ev.requires_approval ? tx("בקשה להשתתף", "Request to attend") : tx("לתשלום ←", "Checkout →")}
      </Button>
      {ev.requires_approval && (
        <p className="text-[11px] text-muted-foreground mt-2 text-center">{tx("נדרש אישור מארגן. לא תחויבו עד לאישור.", "Approval required. You won't be charged until approved.")}</p>
      )}
    </Card>
  );

  return (
    <>
      <div
        className="public-event"
        dir={he ? "rtl" : "ltr"}
        style={{
          backgroundColor: ev.bg_color ?? undefined,
          color: ev.text_color ?? undefined,
        }}
      >
        <TemplateRenderer
          template={template}
          ev={ev}
          he={he}
          ticketCard={ticketCard}
          extras={
          <EventExtras
            data={{
              schedule: ev.schedule,
              highlights: ev.highlights,
              video_url: ev.video_url,
              includes: ev.includes,
              faq: ev.faq,
              location: {
                ...(ev.location_info ?? {}),
                address: ev.location_info?.address || [ev.venue_name, ev.venue_address].filter(Boolean).join(", ") || undefined,
              },
              rules: ev.rules,
              gallery: ev.gallery,
            }}
            order={ev.sections}
            lang={he ? "he" : "en"}
            tone={isDarkColor(ev.bg_color) ?? (template === "poster" || template === "immersive") ? "dark" : "light"}
          />
          }
        />
      </div>
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        event={ev ? { id: ev.id, name: ev.name, currency: ev.currency } : null}
        items={checkoutItems}
      />
      <RequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        event={ev ? { id: ev.id, name: ev.name, currency: ev.currency } : null}
        tickets={requestTickets}
        requireInstagram={!!ev?.require_instagram}
        requireFacebook={!!ev?.require_facebook}
      />
    </>
  );
}

export type TemplateKey = "classic" | "poster" | "split" | "minimal" | "immersive";

function CoverVideo({ ev }: { ev: EventT }) {
  if (!ev.cover_video_url) return null;
  return (
    <video
      src={ev.cover_video_url}
      poster={ev.cover_url ?? undefined}
      autoPlay
      muted
      loop
      playsInline
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

function CoverOverlay({ ev, className = "" }: { ev: EventT; className?: string }) {
  const bg = overlayBackground(readOverlay(ev.logo_layout));
  if (!bg) return null;
  return <div className={`absolute inset-0 pointer-events-none ${className}`} style={{ background: bg }} />;
}

function MetaRow({ ev, tone = "muted", compact = false, he = false }: { ev: EventT; tone?: "muted" | "light"; compact?: boolean; he?: boolean }) {
  const cls = tone === "light" ? "text-white/80" : "text-muted-foreground";
  const openDays = (ev.day_hours ?? []).filter((d) => !d.closed);
  const multi = openDays.length > 1;
  return (
    <div className={`text-sm ${cls}`}>
      <div className="flex flex-wrap items-center gap-4">
        {multi ? (
          compact ? (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatShortDay(openDays[0].date)} {he ? "עד" : "–"} {formatShortDay(openDays[openDays.length - 1].date)}
              <span className="opacity-60">·</span>
              {formatCompactHours(openDays, he)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDay(openDays[0].date)} – {formatDay(openDays[openDays.length - 1].date)}
            </span>
          )
        ) : (
          ev.start_at && <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{new Date(ev.start_at).toLocaleString()}</span>
        )}
        {ev.event_type !== "virtual" && ev.venue_name && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{ev.venue_name}{ev.venue_address ? `, ${ev.venue_address}` : ""}</span>}
        {ev.event_type !== "physical" && <span className="inline-flex items-center gap-1.5"><Video className="h-4 w-4" />{he ? "אירוע אונליין" : "Online event"}</span>}
      </div>
      {!compact && multi && (
        <ul className="mt-2 grid gap-0.5 text-xs">
          {openDays.map((d) => (
            <li key={d.date}>{formatDay(d.date)}: {d.start}–{d.end}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDay(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function formatShortDay(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}`;
}

function formatCompactHours(days: { date: string; start: string; end: string }[], he = false) {
  const starts = new Set(days.map((d) => d.start));
  const ends = new Set(days.map((d) => d.end));
  if (starts.size === 1 && ends.size === 1) {
    return he ? `בין ${days[0].start}-${days[0].end}` : `${days[0].start}-${days[0].end}`;
  }
  return he ? "שעות משתנות" : "Hours vary";
}

function JoinBox({ ev, he = false }: { ev: EventT; he?: boolean }) {
  if (ev.event_type === "physical") return null;
  return (
    <div className="mt-5 rounded-xl border border-black/10 p-4 bg-gradient-to-br from-pink-50 to-sky-50">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{he ? "אירוע אונליין" : "Online event"}</div>
      <p className="text-sm mt-1">
        {he ? "מחזיקי כרטיס יקבלו את קישור הכניסה במייל לאחר הרכישה." : "Ticket holders receive the join link by email after purchase."}
      </p>
    </div>
  );
}

function TemplateRenderer({ template, ev, ticketCard, extras, he = false }: { template: TemplateKey; ev: EventT; ticketCard: ReactNode; extras: ReactNode; he?: boolean }) {
  const isMobile = useIsMobile();
  const device: "mobile" | "desktop" = isMobile ? "mobile" : "desktop";
  const bannerSpot = readSpot(ev.logo_layout, "banner", device, defaultBannerSpot(!!ev.circle_logo_url));
  const circleStyles = circleLogoStyle(readSpot(ev.logo_layout, "circle", device, defaultCircleSpot()));
  if (template === "poster") {
    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        <div className="relative min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-pink-300 via-purple-400 to-sky-400"
            style={ev.cover_url ? { backgroundImage: `url(${ev.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            <CoverVideo ev={ev} />
            <CoverOverlay ev={ev} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/85" />
          <div className="relative z-10 text-center px-6 py-20 sm:py-24 max-w-4xl mx-auto">
            {ev.logo_url && <SafeLogo src={ev.logo_url} alt="Logo" className="mx-auto h-24 sm:h-40 w-auto max-w-[60%] object-contain drop-shadow-2xl" />}
            {ev.tagline && <p className="mt-6 uppercase tracking-[0.3em] text-[11px] sm:text-xs text-white/85">{ev.tagline}</p>}
            <h1 className="mt-3 text-4xl sm:text-6xl lg:text-7xl font-display tracking-tight break-words">{ev.name}</h1>
            <div className="mt-6 flex justify-center"><MetaRow ev={ev} tone="light" compact he={he} /></div>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-10">
          <div className="min-w-0 order-1">
            <JoinBox ev={ev} he={he} />
            {ev.description && <div className="mt-2 max-w-none whitespace-pre-line text-[15px] leading-[1.75] text-white/85">{ev.description}</div>}
          </div>
          <div className="min-w-0 order-3 lg:col-start-1 lg:row-start-2">{extras}</div>
          <div className="lg:sticky lg:top-6 self-start min-w-0 order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2">{ticketCard}</div>
        </div>
      </div>
    );
  }

  if (template === "split") {
    return (
      <div className="bg-white lg:h-[100dvh] lg:overflow-hidden">
        <div className="lg:grid lg:h-full lg:grid-cols-2">
          <div
            className="relative aspect-[4/3] w-full bg-gradient-to-br from-pink-200 to-sky-200 sm:aspect-[16/9] lg:aspect-auto lg:h-full"
            style={ev.cover_url ? { backgroundImage: `url(${ev.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            <CoverVideo ev={ev} />
            <CoverOverlay ev={ev} />
            {ev.logo_url && <SafeLogo src={ev.logo_url} alt="Logo" className="absolute inset-0 m-auto h-1/3 max-h-[45%] w-auto max-w-[60%] object-contain drop-shadow-2xl" />}
          </div>
          <div className="flex min-w-0 flex-col gap-3 px-5 sm:px-8 lg:px-12 py-5 lg:py-6 lg:min-h-0 lg:gap-2 lg:overflow-hidden">
            {ev.tagline && <p className="uppercase tracking-[0.22em] text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{ev.tagline}</p>}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display tracking-tight break-words line-clamp-2">{ev.name}</h1>
            <div className="shrink-0"><MetaRow ev={ev} compact he={he} /></div>
            {ev.description && (
              <div className="whitespace-pre-line text-[13px] sm:text-sm leading-[1.6] text-muted-foreground line-clamp-4 lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:line-clamp-5">
                {ev.description}
              </div>
            )}
            <div className="shrink-0 lg:mt-auto">{ticketCard}</div>
          </div>
        </div>
      </div>
    );
  }

  if (template === "minimal") {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl px-6 pt-16 sm:pt-24 pb-12 text-center">
          {ev.logo_url ? (
            <SafeLogo src={ev.logo_url} alt="Logo" className="mx-auto h-16 sm:h-20 w-auto object-contain" />
          ) : (
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Event</div>
          )}
          {ev.tagline && <p className="mt-10 uppercase tracking-[0.3em] text-[11px] text-muted-foreground">{ev.tagline}</p>}
          <h1 className="mt-3 text-4xl sm:text-6xl lg:text-7xl font-display tracking-tight break-words">{ev.name}</h1>
          <div className="mt-8 flex justify-center"><MetaRow ev={ev} compact he={he} /></div>
        </div>
        {ev.cover_url && (
          <div className="mx-auto max-w-3xl px-6">
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden" style={{ backgroundImage: `url(${ev.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }}>
              <CoverVideo ev={ev} />
            <CoverOverlay ev={ev} />
            </div>
          </div>
        )}
        <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] gap-10">
          <div className="min-w-0 order-1">
            <JoinBox ev={ev} he={he} />
            {ev.description && <div className="mt-2 max-w-none whitespace-pre-line text-[15px] leading-[1.75]">{ev.description}</div>}
          </div>
          <div className="min-w-0 order-3 md:col-start-1 md:row-start-2">{extras}</div>
          <div className="md:sticky md:top-6 self-start min-w-0 order-2 md:col-start-2 md:row-start-1 md:row-span-2">{ticketCard}</div>
        </div>
      </div>
    );
  }

  if (template === "immersive") {
    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        <div
          className="relative h-[70vh] sm:h-[85vh] lg:h-screen w-full bg-gradient-to-br from-pink-300 via-purple-400 to-sky-400"
          style={ev.cover_url ? { backgroundImage: `url(${ev.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          <CoverVideo ev={ev} />
            <CoverOverlay ev={ev} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
          {ev.logo_url && <SafeLogo src={ev.logo_url} alt="Logo" className="absolute top-6 sm:top-8 left-1/2 -translate-x-1/2 h-12 sm:h-20 w-auto max-w-[60%] object-contain drop-shadow-xl" />}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-12 lg:p-16 max-w-4xl">
            {ev.tagline && <p className="uppercase tracking-[0.3em] text-[11px] sm:text-xs text-white/85">{ev.tagline}</p>}
            <h1 className="mt-3 text-4xl sm:text-6xl lg:text-8xl font-display tracking-tight break-words">{ev.name}</h1>
            <div className="mt-6"><MetaRow ev={ev} tone="light" compact he={he} /></div>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-10">
          <div className="min-w-0 order-1">
            <JoinBox ev={ev} he={he} />
            {ev.description && <div className="mt-2 max-w-none whitespace-pre-line text-[15px] leading-[1.75] text-white/85">{ev.description}</div>}
          </div>
          <div className="min-w-0 order-3 lg:col-start-1 lg:row-start-2">{extras}</div>
          <div className="lg:sticky lg:top-6 self-start min-w-0 order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2">{ticketCard}</div>
        </div>
      </div>
    );
  }

  // classic (default)
  return (
    <div className="min-h-screen bg-white">
      <div
        className="relative aspect-[16/10] sm:aspect-[21/9] w-full bg-gradient-to-br from-pink-200 via-purple-200 to-sky-200"
        style={ev.cover_url ? { backgroundImage: `url(${ev.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <CoverVideo ev={ev} />
            <CoverOverlay ev={ev} />
        {ev.logo_url && (
          <SafeLogo
            src={ev.logo_url}
            alt={`${ev.name} logo`}
            className="object-contain drop-shadow-2xl"
            style={bannerLogoStyle(bannerSpot, !!ev.circle_logo_url, device)}
          />
        )}
        {ev.circle_logo_url && (
          <div style={circleStyles.wrapper}>
            <div
              className="rounded-full bg-white shadow-xl ring-4 ring-white overflow-hidden grid place-items-center"
              style={circleStyles.circle}
            >
              <SafeLogo src={ev.circle_logo_url} alt={`${ev.name} logo`} className="h-full w-full object-contain p-[8%]" />
            </div>
          </div>
        )}
      </div>
      <div
        className={`mx-auto max-w-5xl px-4 sm:px-6 pb-10 sm:pb-12 ${ev.circle_logo_url ? "" : "pt-10 sm:pt-12"} grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-10`}
        style={ev.circle_logo_url ? { paddingTop: circleStyles.contentPadding } : undefined}
      >
        <div className="min-w-0 order-1">
          {ev.tagline && <p className="uppercase tracking-[0.22em] text-xs text-muted-foreground">{ev.tagline}</p>}
          <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-display tracking-tight break-words">{ev.name}</h1>
          <div className="mt-4"><MetaRow ev={ev} compact he={he} /></div>
          <JoinBox ev={ev} he={he} />
          {ev.description && <div className="mt-8 max-w-none whitespace-pre-line text-[15px] leading-[1.7]">{ev.description}</div>}
        </div>
        <div className="min-w-0 order-3 lg:col-start-1 lg:row-start-2">{extras}</div>
        <div className="lg:sticky lg:top-6 self-start min-w-0 order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2">{ticketCard}</div>
      </div>
    </div>
  );
}