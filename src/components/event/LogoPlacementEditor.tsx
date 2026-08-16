import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, Monitor, RotateCcw, Smartphone, XCircle } from "lucide-react";
import {
  buildReport,
  sampleCoverColor,
  sampleLogoColor,
  type ContrastReport,
  type Rgb,
} from "./logo-contrast";
import {
  bannerLogoStyle,
  circleLogoStyle,
  defaultBannerSpot,
  defaultCircleSpot,
  readSpot,
  readOverlay,
  overlayBackground,
  type OverlayDirection,
  type CoverOverlay,
  type LogoLayout,
  type LogoSpot,
} from "./logo-placement";

type Device = "mobile" | "desktop";
type Key = "banner" | "circle";

export function LogoPlacementEditor({
  coverUrl,
  coverVideoUrl,
  logoUrl,
  circleLogoUrl,
  layout,
  onChange,
  he,
}: {
  coverUrl: string | null;
  coverVideoUrl?: string | null;
  logoUrl: string | null;
  circleLogoUrl: string | null;
  layout: LogoLayout | null;
  onChange: (next: LogoLayout) => void;
  he: boolean;
}) {
  const t = (h: string, e: string) => (he ? h : e);
  const [device, setDevice] = useState<Device>("mobile");
  const [dragging, setDragging] = useState<Key | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const hasCircle = !!circleLogoUrl;
  const banner = readSpot(layout, "banner", device, defaultBannerSpot(hasCircle));
  const circle = readSpot(layout, "circle", device, defaultCircleSpot());
  const overlay = readOverlay(layout);
  const overlayBg = overlayBackground(overlay);

  function updateOverlay(patch: Partial<typeof overlay>) {
    onChange({ ...(layout ?? {}), overlay: { ...overlay, ...patch } });
  }

  function update(key: Key, patch: Partial<LogoSpot>) {
    const current = key === "banner" ? banner : circle;
    const next: LogoLayout = {
      ...(layout ?? {}),
      [key]: { ...(layout?.[key] ?? {}), [device]: { ...current, ...patch } },
    };
    onChange(next);
  }

  function reset(key: Key) {
    const next: LogoLayout = {
      ...(layout ?? {}),
      [key]: { ...(layout?.[key] ?? {}), [device]: key === "banner" ? defaultBannerSpot(hasCircle) : defaultCircleSpot() },
    };
    onChange(next);
  }

  function startDrag(key: Key, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragging(key);
  }

  function move(e: React.PointerEvent) {
    if (!dragging) return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    update(dragging, {
      x: Math.min(100, Math.max(0, Math.round(x))),
      y: Math.min(130, Math.max(-30, Math.round(y))),
    });
  }

  if (!logoUrl && !circleLogoUrl && !coverUrl && !coverVideoUrl) return null;

  const circleStyles = circleLogoStyle(circle);
  const width = device === "mobile" ? "min(320px, 100%)" : "100%";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Label className="block">{t("מיקום הלוגואים (גרירה)", "Logo placement (drag)")}</Label>
        <div className="inline-flex rounded-full border border-black/15 p-0.5">
          {(["mobile", "desktop"] as Device[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs ${device === d ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              {d === "mobile" ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
              {d === "mobile" ? t("מובייל", "Mobile") : t("דסקטופ", "Desktop")}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("גרור/י את הלוגואים למקום המדויק. ההגדרה נשמרת בנפרד למובייל ולדסקטופ.", "Drag each logo into place. Saved separately for mobile and desktop.")}
      </p>

      <div className="pb-20" style={{ width }}>
        <div
          ref={boxRef}
          onPointerMove={move}
          onPointerUp={() => setDragging(null)}
          onPointerCancel={() => setDragging(null)}
          className={`relative w-full overflow-visible rounded-xl border border-black/10 bg-gradient-to-br from-pink-200 via-purple-200 to-sky-200 touch-none select-none ${device === "mobile" ? "aspect-[16/10]" : "aspect-[21/9]"}`}
          style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {coverVideoUrl && (
            <video src={coverVideoUrl} poster={coverUrl ?? undefined} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover rounded-xl" />
          )}
          {overlayBg && <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: overlayBg }} />}
          {logoUrl && (
            <img
              src={logoUrl}
              alt="banner logo"
              draggable={false}
              onPointerDown={(e) => startDrag("banner", e)}
              style={{ ...bannerLogoStyle(banner, hasCircle, device), cursor: "grab" }}
              className="object-contain drop-shadow-2xl ring-1 ring-white/40 rounded"
            />
          )}
          {circleLogoUrl && (
            <div style={circleStyles.wrapper} onPointerDown={(e) => startDrag("circle", e)} className="cursor-grab">
              <div className="rounded-full bg-white shadow-xl ring-4 ring-white overflow-hidden grid place-items-center" style={circleStyles.circle}>
                <img src={circleLogoUrl} alt="circle logo" draggable={false} className="h-full w-full object-contain p-[8%]" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-black/10 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("שכבת גרדיאנט על התמונה/וידאו", "Gradient overlay (image/video)")}</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => updateOverlay({ intensity: 0, direction: "bottom", color: "#000000" })}>
            <RotateCcw className="h-3.5 w-3.5 me-1" />
            {t("איפוס", "Reset")}
          </Button>
        </div>
        <Row label={t("אטימות", "Opacity")} value={`${overlay.intensity}%`}>
          <input type="range" min={0} max={95} step={1} value={overlay.intensity} onChange={(e) => updateOverlay({ intensity: Number(e.target.value) })} className="w-full" />
        </Row>
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("צבע", "Color")}</span>
            <span className="font-mono">{overlay.color.toUpperCase()}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <input
              type="color"
              value={overlay.color}
              onChange={(e) => updateOverlay({ color: e.target.value })}
              aria-label={t("צבע הגרדיאנט", "Overlay color")}
              className="h-8 w-12 rounded border border-black/15 bg-transparent p-0.5"
            />
            {["#000000", "#0f172a", "#1f2937", "#3b0764", "#7f1d1d", "#052e16", "#ffffff"].map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => updateOverlay({ color: hex })}
                aria-label={hex}
                className={`h-7 w-7 rounded-full border ${overlay.color.toLowerCase() === hex ? "ring-2 ring-offset-1 ring-foreground border-transparent" : "border-black/20"}`}
                style={{ background: hex }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            ["bottom", t("מלמטה", "From bottom")],
            ["top", t("מלמעלה", "From top")],
            ["center", t("מרכז", "Center")],
            ["full", t("אחיד", "Even")],
          ] as [OverlayDirection, string][]).map(([dir, label]) => (
            <button
              key={dir}
              type="button"
              onClick={() => updateOverlay({ direction: dir })}
              className={`h-8 px-3 rounded-full text-xs border ${overlay.direction === dir ? "bg-foreground text-background border-transparent" : "border-black/15 text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("חל גם על תמונת הקאבר וגם על הוידאו, בכל התבניות. אפשר לבחור צבע בהיר להבהרה במקום החשכה.", "Applies to the cover image and the video across all templates. Pick a light color to lighten instead of darken.")}
        </p>
      </div>

      <ContrastPanel
        coverUrl={coverUrl}
        logoUrl={logoUrl}
        circleLogoUrl={circleLogoUrl}
        bannerSpot={banner}
        overlay={overlay}
        he={he}
        onApplyIntensity={(i) => updateOverlay({ intensity: i })}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {logoUrl && (
          <SpotControls
            title={t("לוגו על הבאנר", "Banner logo")}
            spot={banner}
            onChange={(p) => update("banner", p)}
            onReset={() => reset("banner")}
            he={he}
          />
        )}
        {circleLogoUrl && (
          <SpotControls
            title={t("לוגו בעיגול", "Circle logo")}
            spot={circle}
            onChange={(p) => update("circle", p)}
            onReset={() => reset("circle")}
            he={he}
          />
        )}
      </div>
    </div>
  );
}

function ContrastPanel({
  coverUrl,
  logoUrl,
  circleLogoUrl,
  bannerSpot,
  overlay,
  he,
  onApplyIntensity,
}: {
  coverUrl: string | null;
  logoUrl: string | null;
  circleLogoUrl: string | null;
  bannerSpot: LogoSpot;
  overlay: CoverOverlay;
  he: boolean;
  onApplyIntensity: (intensity: number) => void;
}) {
  const t = (h: string, e: string) => (he ? h : e);
  const markUrl = logoUrl ?? circleLogoUrl;
  const [colors, setColors] = useState<{ cover: Rgb; logo: Rgb; exact: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    if (!markUrl) {
      setColors(null);
      return;
    }
    (async () => {
      const [logo, cover] = await Promise.all([
        sampleLogoColor(markUrl),
        coverUrl ? sampleCoverColor(coverUrl, bannerSpot) : Promise.resolve({ color: [128, 128, 128] as Rgb, ok: false }),
      ]);
      if (!alive) return;
      setColors({ cover: cover.color, logo: logo.color, exact: logo.ok && cover.ok });
    })();
    return () => {
      alive = false;
    };
  }, [markUrl, coverUrl, bannerSpot.x, bannerSpot.y]);

  if (!markUrl) return null;

  const report: ContrastReport | null = colors
    ? buildReport({ coverColor: colors.cover, logoColor: colors.logo, overlay, spot: bannerSpot, exact: colors.exact })
    : null;

  const tone =
    report?.verdict === "pass"
      ? { cls: "text-emerald-600", Icon: CheckCircle2, label: t("עובר AA (4.5:1)", "Passes AA (4.5:1)") }
      : report?.verdict === "warn"
        ? { cls: "text-amber-600", Icon: AlertTriangle, label: t("גבולי — עובר AA לטקסט גדול בלבד", "Borderline — large-text AA only") }
        : { cls: "text-destructive", Icon: XCircle, label: t("ניגודיות נמוכה מדי", "Contrast too low") };
  const Icon = tone.Icon;
  const rgb = (c: Rgb) => `rgb(${c[0]},${c[1]},${c[2]})`;

  return (
    <div className="rounded-xl border border-black/10 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{t("בדיקת ניגודיות ללוגו", "Logo contrast check")}</span>
        {report && <span className="text-xs font-mono text-muted-foreground">{report.ratio.toFixed(2)}:1</span>}
      </div>

      {!report ? (
        <p className="text-xs text-muted-foreground">{t("מחשב ניגודיות…", "Measuring contrast…")}</p>
      ) : (
        <>
          <div className={`flex items-center gap-2 text-sm ${tone.cls}`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span>{tone.label}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-5 w-5 rounded border border-black/15" style={{ background: rgb(report.logo) }} />
            <span>{t("צבע הלוגו", "Logo color")}</span>
            <span className="mx-1">·</span>
            <span className="h-5 w-5 rounded border border-black/15" style={{ background: rgb(report.backdrop) }} />
            <span>{t("הרקע מאחוריו (כולל הגרדיאנט)", "Backdrop behind it (with the overlay)")}</span>
          </div>
          {report.verdict !== "pass" && (
            <div className="flex items-center gap-2 flex-wrap">
              {report.suggestedIntensity !== null ? (
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => onApplyIntensity(report.suggestedIntensity!)}>
                  {t(`תקן לאטימות ${report.suggestedIntensity}%`, `Fix with ${report.suggestedIntensity}% opacity`)}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t("גם באטימות מלאה אין ניגודיות מספקת — נסה/י צבע גרדיאנט אחר או גרסת לוגו אחרת.", "Even at full opacity the contrast is not enough — try another overlay color or logo variant.")}
                </span>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {t(
              "הבדיקה מודדת את הלוגו מול הצבע המשוקלל של הקאבר במיקום שבחרת, אחרי החלת הגרדיאנט — ולכן תקפה לכל התבניות.",
              "Measured against the blended cover color at your chosen position after the overlay is applied, so it holds across every template.",
            )}
            {!report.exact &&
              ` ${t("(אומדן — לא ניתן לדגום את התמונה מהדומיין שלה)", "(estimate — the image could not be sampled from its domain)")}`}
          </p>
        </>
      )}
    </div>
  );
}

function SpotControls({
  title,
  spot,
  onChange,
  onReset,
  he,
}: {
  title: string;
  spot: LogoSpot;
  onChange: (patch: Partial<LogoSpot>) => void;
  onReset: () => void;
  he: boolean;
}) {
  const t = (h: string, e: string) => (he ? h : e);
  return (
    <div className="rounded-xl border border-black/10 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5 me-1" />
          {t("איפוס", "Reset")}
        </Button>
      </div>
      <Row label={t("גודל", "Size")} value={`${Math.round(spot.scale * 100)}%`}>
        <input type="range" min={40} max={200} step={5} value={Math.round(spot.scale * 100)} onChange={(e) => onChange({ scale: Number(e.target.value) / 100 })} className="w-full" />
      </Row>
      <Row label={t("אופקי", "Horizontal")} value={`${spot.x}%`}>
        <input type="range" min={0} max={100} value={spot.x} onChange={(e) => onChange({ x: Number(e.target.value) })} className="w-full" />
      </Row>
      <Row label={t("אנכי", "Vertical")} value={`${spot.y}%`}>
        <input type="range" min={-30} max={130} value={spot.y} onChange={(e) => onChange({ y: Number(e.target.value) })} className="w-full" />
      </Row>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      {children}
    </div>
  );
}
