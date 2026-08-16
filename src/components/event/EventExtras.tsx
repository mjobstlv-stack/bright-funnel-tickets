import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconValue } from "@/components/event/IconPicker";
import { InlineIconText } from "@/components/event/inline-icons";
import { useRef, type ReactNode } from "react";

export type ScheduleItem = { time?: string; title: string; description?: string };
export type HighlightItem = { icon?: string; title: string; description?: string };
export type IncludeItem = { icon?: string; text: string };
export type FaqItem = { question: string; answer: string };
export type LocationInfo = {
  address?: string;
  parking?: string;
  transit?: string;
  notes?: string;
  map_url?: string;
};

export type ExtrasData = {
  schedule?: ScheduleItem[] | null;
  highlights?: HighlightItem[] | null;
  video_url?: string | null;
  includes?: IncludeItem[] | null;
  faq?: FaqItem[] | null;
  location?: LocationInfo | null;
  rules?: string[] | null;
  gallery?: string[] | null;
};

export type SectionKey =
  "highlights" | "includes" | "location" | "schedule" | "faq" | "rules" | "video" | "gallery";

export type SectionEntry = { key: SectionKey; enabled: boolean };

export const DEFAULT_SECTIONS: SectionEntry[] = [
  { key: "highlights", enabled: true },
  { key: "includes", enabled: true },
  { key: "location", enabled: true },
  { key: "schedule", enabled: true },
  { key: "gallery", enabled: true },
  { key: "faq", enabled: true },
  { key: "rules", enabled: true },
  { key: "video", enabled: true },
];

export const SECTION_LABELS: Record<SectionKey, { he: string; en: string }> = {
  highlights: { he: "הדגשים", en: "Highlights" },
  includes: { he: "מה כלול", en: "Includes" },
  location: { he: "מיקום וגישה", en: "Location" },
  schedule: { he: "תוכנייה", en: "Schedule" },
  faq: { he: "שאלות נפוצות", en: "FAQ" },
  rules: { he: "נהלים", en: "Rules" },
  video: { he: "סרטון", en: "Video" },
  gallery: { he: "גלריה", en: "Gallery" },
};

export function mergeSectionsWithDefaults(sections?: SectionEntry[] | null): SectionEntry[] {
  const list = Array.isArray(sections)
    ? sections.filter((s) => s && typeof s.key === "string")
    : [];
  const seen = new Set(list.map((s) => s.key));
  const merged: SectionEntry[] = list.map((s) => ({
    key: s.key as SectionKey,
    enabled: s.enabled !== false,
  }));
  for (const d of DEFAULT_SECTIONS) if (!seen.has(d.key)) merged.push({ ...d });
  return merged;
}

function IconByName({ name, className }: { name?: string; className?: string }) {
  return <IconValue value={name} className={className} />;
}

function getEmbedUrl(url: string): { kind: "iframe" | "video"; src: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
    }
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(u.pathname)) return { kind: "video", src: url };
    return { kind: "iframe", src: url };
  } catch {
    return null;
  }
}

export function EventExtras({
  data,
  tone = "light",
  className = "",
  order,
  lang = "en",
}: {
  data: ExtrasData;
  tone?: "light" | "dark";
  className?: string;
  order?: SectionEntry[] | null;
  lang?: "he" | "en";
}) {
  const he = lang === "he";
  const L = {
    highlightsKicker: he ? "הדגשים" : "Highlights",
    highlightsTitle: he ? "מה מחכה לכם" : "What to expect",
    includesKicker: he ? "מה כלול" : "Includes",
    includesTitle: he ? "מה כלול בכרטיס" : "What's included",
    locationKicker: he ? "איך מגיעים" : "Getting there",
    locationTitle: he ? "מיקום וגישה" : "Location & access",
    scheduleKicker: he ? "תוכנייה" : "Program",
    scheduleTitle: he ? "לוח זמנים" : "Schedule",
    faqKicker: he ? "שאלות נפוצות" : "FAQ",
    faqTitle: he ? "כל מה שרציתם לדעת" : "Frequently asked",
    rulesKicker: he ? "כדאי לדעת" : "Good to know",
    rulesTitle: he ? "נהלים" : "Event rules",
    videoKicker: he ? "סרטון" : "Video",
    videoTitle: he ? "צפו בסרטון" : "Watch",
    galleryKicker: he ? "גלריה" : "Gallery",
    galleryTitle: he ? "תמונות מהאירוע" : "Photos",
    address: he ? "כתובת" : "Address",
    parking: he ? "חנייה" : "Parking",
    transit: he ? "תחבורה ציבורית" : "Public transit",
    notes: he ? "הערות" : "Notes",
    openMaps: he ? "פתחו במפות ←" : "Open in maps →",
    maps: he ? "מפות" : "Maps",
    prev: he ? "הבא" : "Previous",
    next: he ? "הקודם" : "Next",
  };
  const schedule = (data.schedule ?? []).filter((s) => s && (s.title || s.time));
  const highlights = (data.highlights ?? []).filter((h) => h && h.title);
  const video = data.video_url ? getEmbedUrl(data.video_url) : null;
  const includes = (data.includes ?? []).filter((i) => i && i.text);
  const faq = (data.faq ?? []).filter((f) => f && (f.question || f.answer));
  const rules = (data.rules ?? []).filter((r) => typeof r === "string" && r.trim());
  const gallery = (data.gallery ?? []).filter((u) => typeof u === "string" && u.trim());
  const loc = data.location ?? null;
  const hasLoc = !!(loc && (loc.address || loc.parking || loc.transit || loc.notes || loc.map_url));
  const mapQuery = loc?.address?.trim() || "";
  const mapEmbedSrc = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
    : null;
  const gmapsHref = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : (loc?.map_url ?? null);
  const wazeHref = mapQuery
    ? `https://waze.com/ul?q=${encodeURIComponent(mapQuery)}&navigate=yes`
    : null;

  if (
    schedule.length === 0 &&
    highlights.length === 0 &&
    !video &&
    includes.length === 0 &&
    faq.length === 0 &&
    rules.length === 0 &&
    !hasLoc &&
    gallery.length === 0
  )
    return null;

  const isDark = tone === "dark";
  const heading = "font-display text-2xl sm:text-3xl tracking-tight";
  const cardBorder = isDark ? "border-white/15 bg-white/5" : "border-black/10 bg-white";
  const mutedText = isDark ? "text-white/70" : "text-muted-foreground";
  const sectionLabel = `text-xs uppercase tracking-[0.22em] ${mutedText}`;

  const sectionOrder = mergeSectionsWithDefaults(order);

  const renderers: Record<SectionKey, () => ReactNode> = {
    highlights: () =>
      highlights.length > 0 && (
        <section aria-labelledby="extras-highlights">
          <p className={sectionLabel}>{L.highlightsKicker}</p>
          <h2 id="extras-highlights" className={`mt-2 ${heading}`}>
            {L.highlightsTitle}
          </h2>
          <ul className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {highlights.slice(0, 6).map((h, i) => (
              <li key={i} className={`rounded-2xl border p-5 text-center ${cardBorder}`}>
                <div
                  className={`mx-auto h-10 w-10 rounded-xl grid place-items-center ${isDark ? "bg-white/10" : "bg-black/[0.04]"}`}
                >
                  <IconByName name={h.icon} className="h-5 w-5" />
                </div>
                <div className="mt-4 font-medium">
                  <InlineIconText text={h.title} />
                </div>
                {h.description && (
                  <p className={`mt-1 text-sm ${mutedText}`}>
                    <InlineIconText text={h.description} />
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ),
    includes: () =>
      includes.length > 0 && (
        <section aria-labelledby="extras-includes">
          <p className={sectionLabel}>{L.includesKicker}</p>
          <h2 id="extras-includes" className={`mt-2 ${heading}`}>
            {L.includesTitle}
          </h2>
          <ul className="mt-6 grid sm:grid-cols-2 gap-2">
            {includes.map((it, i) => (
              <li key={i} className={`flex items-start gap-3 rounded-xl border p-4 ${cardBorder}`}>
                <div
                  className={`h-8 w-8 shrink-0 rounded-lg grid place-items-center ${isDark ? "bg-white/10" : "bg-black/[0.04]"}`}
                >
                  <IconByName name={it.icon} className="h-4 w-4" />
                </div>
                <InlineIconText text={it.text} className="text-sm leading-snug pt-1" />
              </li>
            ))}
          </ul>
        </section>
      ),
    location: () =>
      hasLoc && (
        <section aria-labelledby="extras-location">
          <p className={sectionLabel}>{L.locationKicker}</p>
          <h2 id="extras-location" className={`mt-2 ${heading}`}>
            {L.locationTitle}
          </h2>
          <div className={`mt-6 rounded-2xl border overflow-hidden ${cardBorder}`}>
            {mapEmbedSrc && (
              <div className="relative aspect-[16/9] w-full bg-black/5">
                <iframe
                  src={mapEmbedSrc}
                  title="Event location map"
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                {(gmapsHref || wazeHref) && (
                  <div className="absolute top-3 start-3 flex flex-wrap gap-2 z-10">
                    {gmapsHref && (
                      <a
                        href={gmapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 bg-white text-black shadow-md hover:bg-white/90 border border-black/10"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3.5 w-3.5"
                        >
                          <path d="M15 3h6v6" />
                          <path d="M10 14 21 3" />
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        </svg>
                        {L.maps}
                      </a>
                    )}
                    {wazeHref && (
                      <a
                        href={wazeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 bg-white text-black shadow-md hover:bg-white/90 border border-black/10"
                      >
                        Waze
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
            {!mapEmbedSrc && (gmapsHref || wazeHref) && (
              <div className="flex flex-wrap gap-2 p-4">
                {wazeHref && (
                  <a
                    href={wazeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 text-sm rounded-full px-4 py-2 border ${isDark ? "border-white/20 hover:bg-white/10" : "border-black/15 hover:bg-black/[0.04]"}`}
                  >
                    Waze →
                  </a>
                )}
                {gmapsHref && (
                  <a
                    href={gmapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 text-sm rounded-full px-4 py-2 border ${isDark ? "border-white/20 hover:bg-white/10" : "border-black/15 hover:bg-black/[0.04]"}`}
                  >
                    Google Maps →
                  </a>
                )}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-5 p-5 sm:p-6 pt-0">
              {loc?.address && (
                <div>
                  <div className={`text-[11px] uppercase tracking-widest ${mutedText}`}>
                    {L.address}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed">{loc.address}</p>
                </div>
              )}
              {loc?.parking && (
                <div>
                  <div className={`text-[11px] uppercase tracking-widest ${mutedText}`}>
                    {L.parking}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed">{loc.parking}</p>
                </div>
              )}
              {loc?.transit && (
                <div>
                  <div className={`text-[11px] uppercase tracking-widest ${mutedText}`}>
                    {L.transit}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed">{loc.transit}</p>
                </div>
              )}
              {loc?.notes && (
                <div>
                  <div className={`text-[11px] uppercase tracking-widest ${mutedText}`}>
                    {L.notes}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed">{loc.notes}</p>
                </div>
              )}
              {loc?.map_url && !mapQuery && (
                <div className="sm:col-span-2">
                  <a
                    href={loc.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 text-sm underline underline-offset-4 ${isDark ? "text-white" : "text-foreground"}`}
                  >
                    {L.openMaps}
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      ),
    schedule: () =>
      schedule.length > 0 && (
        <section aria-labelledby="extras-schedule">
          <p className={sectionLabel}>{L.scheduleKicker}</p>
          <h2 id="extras-schedule" className={`mt-2 ${heading}`}>
            {L.scheduleTitle}
          </h2>
          <ol
            className={`mt-6 rounded-2xl border divide-y ${isDark ? "border-white/15 divide-white/10 bg-white/5" : "border-black/10 divide-black/5 bg-white"}`}
          >
            {schedule.map((s, i) => (
              <li
                key={i}
                className="p-4 sm:p-5 grid grid-cols-[88px_1fr] sm:grid-cols-[120px_1fr] gap-4 items-start"
              >
                <div className={`text-sm font-mono ${mutedText}`}>{s.time || "—"}</div>
                <div className="min-w-0">
                  <div className="font-medium">
                    <InlineIconText text={s.title} />
                  </div>
                  {s.description && (
                    <p className={`mt-0.5 text-sm ${mutedText}`}>
                      <InlineIconText text={s.description} />
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ),
    faq: () =>
      faq.length > 0 && (
        <section aria-labelledby="extras-faq">
          <p className={sectionLabel}>{L.faqKicker}</p>
          <h2 id="extras-faq" className={`mt-2 ${heading}`}>
            {L.faqTitle}
          </h2>
          <div
            className={`mt-6 rounded-2xl border divide-y ${isDark ? "border-white/15 divide-white/10 bg-white/5" : "border-black/10 divide-black/5 bg-white"}`}
          >
            {faq.map((f, i) => (
              <details
                key={i}
                className="group p-4 sm:p-5 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-start justify-between gap-4 cursor-pointer list-none">
                  <span className="font-medium">
                    <InlineIconText text={f.question} />
                  </span>
                  <span
                    className={`mt-0.5 text-lg leading-none transition-transform group-open:rotate-45 ${mutedText}`}
                  >
                    +
                  </span>
                </summary>
                <p className={`mt-3 text-sm leading-relaxed whitespace-pre-line ${mutedText}`}>
                  <InlineIconText text={f.answer} />
                </p>
              </details>
            ))}
          </div>
        </section>
      ),
    rules: () =>
      rules.length > 0 && (
        <section aria-labelledby="extras-rules">
          <p className={sectionLabel}>{L.rulesKicker}</p>
          <h2 id="extras-rules" className={`mt-2 ${heading}`}>
            {L.rulesTitle}
          </h2>
          <ul
            className={`mt-6 rounded-2xl border divide-y ${isDark ? "border-white/15 divide-white/10 bg-white/5" : "border-black/10 divide-black/5 bg-white"}`}
          >
            {rules.map((r, i) => (
              <li key={i} className="p-4 sm:p-5 flex items-start gap-3">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${isDark ? "bg-white/70" : "bg-black/60"}`}
                />
                <InlineIconText text={r} className="text-sm leading-relaxed" />
              </li>
            ))}
          </ul>
        </section>
      ),
    video: () =>
      video && (
        <section aria-labelledby="extras-video">
          <p className={sectionLabel}>{L.videoKicker}</p>
          <h2 id="extras-video" className={`mt-2 ${heading}`}>
            {L.videoTitle}
          </h2>
          <div
            className={`mt-6 aspect-video rounded-2xl overflow-hidden border ${isDark ? "border-white/15" : "border-black/10"} bg-black`}
          >
            {video.kind === "iframe" ? (
              <iframe
                src={video.src}
                title="Event video"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <video
                src={video.src}
                controls
                playsInline
                className="h-full w-full object-contain"
              />
            )}
          </div>
        </section>
      ),
    gallery: () =>
      gallery.length > 0 && (
        <section aria-labelledby="extras-gallery">
          <p className={sectionLabel}>{L.galleryKicker}</p>
          <h2 id="extras-gallery" className={`mt-2 ${heading}`}>
            {L.galleryTitle}
          </h2>
          <GallerySlider
            images={gallery}
            isDark={isDark}
            rtl={he}
            labels={{ prev: L.prev, next: L.next }}
          />
        </section>
      ),
  };

  return (
    <div className={`space-y-14 ${className}`}>
      {sectionOrder
        .filter((s) => s.enabled)
        .map((s) => {
          const node = renderers[s.key]?.();
          return node ? <div key={s.key}>{node}</div> : null;
        })}
    </div>
  );
}

function GallerySlider({
  images,
  isDark,
  rtl,
  labels,
}: {
  images: string[];
  isDark: boolean;
  rtl?: boolean;
  labels: { prev: string; next: string };
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollBy(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  }

  const btn = `h-10 w-10 rounded-full grid place-items-center border shadow-sm transition-colors ${
    isDark
      ? "border-white/20 bg-black/50 text-white hover:bg-black/70"
      : "border-black/10 bg-white/90 text-foreground hover:bg-white"
  }`;

  return (
    <div className="relative mt-6 min-w-0">
      <div
        ref={trackRef}
        className="flex w-full min-w-0 gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <a
            key={i}
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className={`group relative shrink-0 snap-center w-[78%] sm:w-[46%] lg:w-[38%] aspect-[4/3] overflow-hidden rounded-2xl border ${
              isDark ? "border-white/15" : "border-black/10"
            } bg-black/5`}
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </a>
        ))}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label={labels.prev}
            className={btn}
            onClick={() => scrollBy(-1)}
          >
            {rtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            type="button"
            aria-label={labels.next}
            className={btn}
            onClick={() => scrollBy(1)}
          >
            {rtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
}

export const HIGHLIGHT_ICONS: { name: string; label: string }[] = [
  { name: "Music", label: "Music" },
  { name: "Mic", label: "Mic" },
  { name: "Headphones", label: "DJ" },
  { name: "PartyPopper", label: "Party" },
  { name: "Utensils", label: "Food" },
  { name: "Wine", label: "Drinks" },
  { name: "Gift", label: "Gift" },
  { name: "Camera", label: "Photo" },
  { name: "Users", label: "Crowd" },
  { name: "Star", label: "Star" },
  { name: "Trophy", label: "Award" },
  { name: "Heart", label: "Love" },
  { name: "MapPin", label: "Location" },
  { name: "Calendar", label: "Date" },
  { name: "Clock", label: "Time" },
  { name: "Ticket", label: "Ticket" },
  { name: "Video", label: "Video" },
  { name: "Sparkles", label: "Sparkle" },
  { name: "Flame", label: "Hot" },
  { name: "Sun", label: "Sun" },
];
