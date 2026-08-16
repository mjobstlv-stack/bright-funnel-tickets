import { useMemo, useRef, useState } from "react";
import {
  icons as lucideIcons,
  Sparkles,
  Search,
  Upload,
  Loader2,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";
import { Slider } from "@/components/ui/slider";
import {
  parseIconValue,
  serializeIconValue,
  iconCss,
  hasIconStyle,
  type IconStyle,
} from "@/components/event/icon-style";

type IconCmp = React.ComponentType<{ className?: string }>;

export function isCustomIcon(value?: string | null) {
  const icon = parseIconValue(value).icon;
  return !!icon && /^(https?:|data:image\/)/i.test(icon);
}

/** Renders a lucide icon by name, or a custom uploaded icon when the value is a URL. */
export function IconValue({
  value,
  className,
  style,
}: {
  value?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { icon, style: iconStyle } = parseIconValue(value);
  const css = { ...iconCss(iconStyle), ...style };
  if (/^(https?:|data:image\/)/i.test(icon)) {
    return (
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        style={css}
        className={`${className ?? "h-5 w-5"} object-contain`}
        loading="lazy"
      />
    );
  }
  const map = lucideIcons as unknown as Record<string, IconCmp>;
  const Cmp = ((icon && map[icon]) || (Sparkles as unknown as IconCmp)) as React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  return <Cmp className={className} style={css} aria-hidden="true" />;
}

const POPULAR = [
  "Sparkles",
  "Music",
  "PartyPopper",
  "Wine",
  "Beer",
  "UtensilsCrossed",
  "Pizza",
  "Coffee",
  "Cake",
  "IceCream",
  "Mic",
  "Disc3",
  "Camera",
  "Car",
  "MapPin",
  "Clock",
  "CalendarDays",
  "Users",
  "Baby",
  "Dog",
  "Sun",
  "Moon",
  "Flame",
  "Star",
  "Heart",
  "Gift",
  "Ticket",
  "ShieldCheck",
  "Accessibility",
  "Waves",
  "TreePalm",
  "Tent",
  "Trophy",
  "Wifi",
  "ParkingCircle",
];

const MAX_BYTES = 1024 * 1024;
const ALLOWED = ["image/svg+xml", "image/png", "image/webp", "image/jpeg", "image/gif"];

type Pending = {
  file: File;
  previewUrl: string;
  isSvg: boolean;
  width?: number;
  height?: number;
  sanitizedSvg?: string;
};

/** Strips scripts, event handlers and external refs from SVG markup. */
function sanitizeSvg(src: string) {
  let out = src
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/<(iframe|object|embed|use|image)\b[\s\S]*?(\/>|<\/\1>)/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|xlink:href)\s*=\s*("|')\s*(javascript|data):[^"']*\2/gi, "");
  return out.trim();
}

export function IconPicker({
  value,
  onChange,
  userId,
  scopeId,
  className,
  compact = false,
  triggerLabel,
}: {
  value?: string;
  onChange: (v: string) => void;
  userId?: string | null;
  scopeId?: string | null;
  className?: string;
  /** Icon-only trigger, for inserting an icon into a text field. */
  compact?: boolean;
  triggerLabel?: string;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [checking, setChecking] = useState(false);
  const [style, setStyle] = useState<IconStyle>(() => parseIconValue(value).style);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentIcon = parseIconValue(value).icon;

  function emit(icon: string, st: IconStyle = style) {
    onChange(serializeIconValue(icon, st));
  }

  function applyStyle(next: IconStyle) {
    setStyle(next);
    if (!compact && currentIcon) onChange(serializeIconValue(currentIcon, next));
  }

  const allNames = useMemo(() => Object.keys(lucideIcons).filter((n) => /^[A-Z]/.test(n)), []);
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return POPULAR.filter((n) => (lucideIcons as Record<string, unknown>)[n]);
    return allNames.filter((n) => n.toLowerCase().includes(term)).slice(0, 120);
  }, [q, allNames]);

  function clearPending() {
    if (pending) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
  }

  /** Validates format + size, then stages a preview instead of uploading directly. */
  async function stage(file: File) {
    if (!userId) {
      toast.error(t("נדרשת התחברות", "Sign in required"));
      return;
    }
    const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
    if (!isSvg && !ALLOWED.includes(file.type)) {
      toast.error(
        t("פורמט לא נתמך — SVG, PNG, WEBP או JPG", "Unsupported format — SVG, PNG, WEBP or JPG"),
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(
        t(
          `הקובץ ${(file.size / 1024 / 1024).toFixed(2)}MB — מותר עד 1MB`,
          `File is ${(file.size / 1024 / 1024).toFixed(2)}MB — max 1MB`,
        ),
      );
      return;
    }
    if (file.size === 0) {
      toast.error(t("הקובץ ריק", "File is empty"));
      return;
    }

    setChecking(true);
    clearPending();
    try {
      if (isSvg) {
        const raw = await file.text();
        if (!/<svg[\s>]/i.test(raw)) {
          toast.error(t("קובץ ה-SVG פגום", "Invalid SVG file"));
          return;
        }
        const sanitized = sanitizeSvg(raw);
        const doc = new DOMParser().parseFromString(sanitized, "image/svg+xml");
        const svg = doc.querySelector("svg");
        if (doc.querySelector("parsererror") || !svg) {
          toast.error(t("קובץ ה-SVG פגום", "Invalid SVG file"));
          return;
        }
        const vb = (svg.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
        const w =
          Number.parseFloat(svg.getAttribute("width") || "") ||
          (vb.length === 4 ? vb[2] : undefined);
        const h =
          Number.parseFloat(svg.getAttribute("height") || "") ||
          (vb.length === 4 ? vb[3] : undefined);
        const blob = new Blob([sanitized], { type: "image/svg+xml" });
        setPending({
          file,
          previewUrl: URL.createObjectURL(blob),
          isSvg: true,
          width: w,
          height: h,
          sanitizedSvg: sanitized,
        });
        return;
      }
      const url = URL.createObjectURL(file);
      const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = url;
      });
      if (!dims) {
        URL.revokeObjectURL(url);
        toast.error(t("לא ניתן לקרוא את התמונה", "Could not read the image"));
        return;
      }
      setPending({ file, previewUrl: url, isSvg: false, width: dims.w, height: dims.h });
    } finally {
      setChecking(false);
    }
  }

  async function confirmUpload() {
    if (!pending || !userId) return;
    const { file, isSvg, sanitizedSvg } = pending;
    setUploading(true);
    try {
      const ext = isSvg ? "svg" : (file.name.split(".").pop() || "png").toLowerCase();
      const contentType = isSvg ? "image/svg+xml" : file.type;
      const body: Blob =
        isSvg && sanitizedSvg ? new Blob([sanitizedSvg], { type: contentType }) : file;
      const path = `${userId}/${scopeId ?? "icons"}/icon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage
        .from("event-media")
        .upload(path, body, { upsert: false, contentType });
      if (up.error) {
        toast.error(up.error.message);
        return;
      }
      const signed = await supabase.storage
        .from("event-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error || !signed.data) {
        toast.error(t("יצירת קישור נכשלה", "Could not create link"));
        return;
      }
      emit(signed.data.signedUrl);
      toast.success(t("האייקון הועלה", "Icon uploaded"));
      clearPending();
      setOpen(false);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setStyle(parseIconValue(value).style);
      }}
    >
      <PopoverTrigger asChild>
        {compact ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`h-9 w-9 shrink-0 ${className ?? ""}`}
            aria-label={triggerLabel ?? t("הוסף אייקון לטקסט", "Insert icon into text")}
            title={triggerLabel ?? t("הוסף אייקון לטקסט", "Insert icon into text")}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className={`h-9 justify-start gap-2 px-2 font-normal ${className ?? ""}`}
            aria-label={t("בחר אייקון", "Choose icon")}
          >
            <span className="h-6 w-6 shrink-0 grid place-items-center rounded-md bg-black/[0.04]">
              <IconValue value={value} className="h-4 w-4" />
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {isCustomIcon(value) ? t("אייקון מותאם", "Custom") : currentIcon || "Sparkles"}
            </span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-3">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("חיפוש אייקון (באנגלית)…", "Search icons (English)…")}
            className="ps-8 h-9"
          />
        </div>

        <div className="mt-3 grid grid-cols-8 gap-1 max-h-52 overflow-y-auto">
          {results.map((n) => (
            <button
              key={n}
              type="button"
              title={n}
              onClick={() => {
                emit(n);
                setOpen(false);
              }}
              className={`h-9 w-9 grid place-items-center rounded-md hover:bg-black/5 ${currentIcon === n ? "bg-black/[0.06] ring-1 ring-black/15" : ""}`}
            >
              <IconValue
                value={n}
                className="h-4 w-4"
                style={{ width: undefined, height: undefined, color: style.color }}
              />
            </button>
          ))}
          {results.length === 0 && (
            <p className="col-span-8 text-xs text-muted-foreground py-3 text-center">
              {t("לא נמצאו אייקונים", "No icons found")}
            </p>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-black/5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">{t("עיצוב האייקון", "Icon styling")}</p>
            {hasIconStyle(style) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => applyStyle({})}
              >
                {t("איפוס", "Reset")}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-12">{t("צבע", "Color")}</span>
            <input
              type="color"
              aria-label={t("צבע האייקון", "Icon color")}
              value={style.color ?? "#111111"}
              onChange={(e) => applyStyle({ ...style, color: e.target.value })}
              className="h-7 w-10 rounded border border-black/10 bg-transparent p-0"
            />
            {style.color && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => applyStyle({ ...style, color: undefined })}
              >
                {t("ברירת מחדל", "Inherit")}
              </Button>
            )}
            <span className="ms-auto grid h-8 w-8 place-items-center rounded-md bg-black/[0.04]">
              <IconValue
                value={serializeIconValue(currentIcon || "Sparkles", style)}
                className="h-4 w-4"
              />
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-12">{t("גודל", "Size")}</span>
            <Slider
              value={[style.size ?? 1]}
              min={0.6}
              max={2.5}
              step={0.05}
              onValueChange={(v) => applyStyle({ ...style, size: v[0] })}
              className="flex-1"
            />
            <span className="text-[11px] tabular-nums w-9 text-end">
              {(style.size ?? 1).toFixed(2)}×
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-12">{t("מרווח", "Spacing")}</span>
            <Slider
              value={[style.gap ?? 0.28]}
              min={0}
              max={1.2}
              step={0.02}
              onValueChange={(v) => applyStyle({ ...style, gap: v[0] })}
              className="flex-1"
            />
            <span className="text-[11px] tabular-nums w-9 text-end">
              {(style.gap ?? 0.28).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-black/5 space-y-2">
          <p className="text-xs text-muted-foreground">
            {t(
              "או העלה אייקון משלך (SVG/PNG/WEBP/JPG, עד 1MB)",
              "Or upload your own icon (SVG/PNG/WEBP/JPG, up to 1MB)",
            )}
          </p>
          {pending && (
            <div className="rounded-lg border border-black/10 p-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-12 w-12 shrink-0 grid place-items-center rounded-md bg-[repeating-conic-gradient(#0000000d_0_25%,transparent_0_50%)] bg-[length:12px_12px]">
                  <img
                    src={pending.previewUrl}
                    alt=""
                    className="max-h-10 max-w-10 object-contain"
                  />
                </span>
                <div className="min-w-0 text-xs">
                  <p className="truncate font-medium">{pending.file.name}</p>
                  <p className="text-muted-foreground">
                    {pending.isSvg ? "SVG" : pending.file.type.replace("image/", "").toUpperCase()}
                    {" · "}
                    {(pending.file.size / 1024).toFixed(0)}KB
                    {pending.width && pending.height
                      ? ` · ${Math.round(pending.width)}×${Math.round(pending.height)}`
                      : ""}
                  </p>
                </div>
              </div>
              {pending.isSvg && (
                <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  {t(
                    "ה-SVG נוקה מסקריפטים והפניות חיצוניות",
                    "SVG was sanitized from scripts and external refs",
                  )}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full"
                  disabled={uploading}
                  onClick={() => void confirmUpload()}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 me-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 me-1" />
                  )}
                  {t("שמור אייקון", "Save icon")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  onClick={clearPending}
                >
                  <X className="h-4 w-4 me-1" /> {t("ביטול", "Cancel")}
                </Button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={uploading || checking}
              onClick={() => fileRef.current?.click()}
            >
              {checking ? (
                <Loader2 className="h-4 w-4 me-1 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 me-1" />
              )}
              {pending ? t("בחר קובץ אחר", "Choose another file") : t("העלאה", "Upload")}
            </Button>
            {isCustomIcon(value) && (
              <Button type="button" variant="ghost" size="sm" onClick={() => emit("Sparkles")}>
                <X className="h-4 w-4 me-1" /> {t("הסר מותאם", "Remove custom")}
              </Button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/svg+xml,image/png,image/webp,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void stage(f);
              e.target.value = "";
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
