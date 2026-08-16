export type LogoSpot = { x: number; y: number; scale: number };
export type LogoDeviceSpots = { mobile?: LogoSpot; desktop?: LogoSpot };
export type OverlayDirection = "bottom" | "top" | "full" | "center";
export type CoverOverlay = { intensity: number; direction: OverlayDirection; color: string };
export type LogoLayout = {
  banner?: LogoDeviceSpots;
  circle?: LogoDeviceSpots;
  overlay?: CoverOverlay;
};

export const DEFAULT_OVERLAY: CoverOverlay = {
  intensity: 0,
  direction: "bottom",
  color: "#000000",
};

/** Accepts #rgb / #rrggbb, falls back to black. */
function readColor(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return s;
  return "#000000";
}

function toRgb(hex: string): [number, number, number] {
  let h = hex.slice(1);
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function readOverlay(layout: LogoLayout | null | undefined): CoverOverlay {
  const o = layout?.overlay;
  if (!o) return DEFAULT_OVERLAY;
  const intensity = Math.min(90, Math.max(0, Number(o.intensity) || 0));
  const direction: OverlayDirection = (["bottom", "top", "full", "center"] as const).includes(
    o.direction as OverlayDirection,
  )
    ? (o.direction as OverlayDirection)
    : "bottom";
  return { intensity, direction, color: readColor(o.color) };
}

/** CSS background for the darkening overlay above the cover image/video. */
export function overlayBackground(o: CoverOverlay): string | undefined {
  const a = o.intensity / 100;
  if (a <= 0) return undefined;
  const [r, g, b] = toRgb(readColor(o.color));
  const c = (v: number) => `rgba(${r},${g},${b},${Math.max(0, Math.min(1, v)).toFixed(3)})`;
  switch (o.direction) {
    case "full":
      return `linear-gradient(to bottom, ${c(a)}, ${c(a)})`;
    case "top":
      return `linear-gradient(to bottom, ${c(a)}, ${c(a * 0.55)} 45%, ${c(0)})`;
    case "center":
      return `radial-gradient(ellipse at center, ${c(a)}, ${c(a * 0.35)} 70%, ${c(0)})`;
    case "bottom":
    default:
      return `linear-gradient(to top, ${c(a)}, ${c(a * 0.55)} 45%, ${c(0)})`;
  }
}

export const CIRCLE_BASE = "clamp(4.5rem, 22vw, 10rem)";

export function defaultBannerSpot(hasCircle: boolean): LogoSpot {
  return { x: 50, y: hasCircle ? 26 : 50, scale: 1 };
}
export function defaultCircleSpot(): LogoSpot {
  return { x: 50, y: 100, scale: 1 };
}

function clampSpot(s: LogoSpot): LogoSpot {
  return {
    x: Math.min(100, Math.max(0, s.x)),
    y: Math.min(130, Math.max(-30, s.y)),
    scale: Math.min(2, Math.max(0.4, s.scale)),
  };
}

export function readSpot(
  layout: LogoLayout | null | undefined,
  key: "banner" | "circle",
  device: "mobile" | "desktop",
  fallback: LogoSpot,
): LogoSpot {
  const spots = layout?.[key];
  const spot = spots?.[device] ?? spots?.[device === "mobile" ? "desktop" : "mobile"];
  return spot ? clampSpot({ ...fallback, ...spot }) : fallback;
}

/** Banner logo height as a percentage of the banner height, before scaling. */
function bannerBaseHeight(hasCircle: boolean, device: "mobile" | "desktop") {
  if (hasCircle) return device === "mobile" ? 34 : 45;
  return device === "mobile" ? 42 : 60;
}

export function bannerLogoStyle(spot: LogoSpot, hasCircle: boolean, device: "mobile" | "desktop") {
  return {
    position: "absolute" as const,
    left: `${spot.x}%`,
    top: `${spot.y}%`,
    transform: "translate(-50%, -50%)",
    height: `${bannerBaseHeight(hasCircle, device) * spot.scale}%`,
    width: "auto",
    maxWidth: device === "mobile" ? "82%" : "72%",
  };
}

export function circleLogoStyle(spot: LogoSpot) {
  const size = `calc(${CIRCLE_BASE} * ${spot.scale})`;
  return {
    wrapper: {
      position: "absolute" as const,
      left: `${spot.x}%`,
      top: `${spot.y}%`,
      transform: "translate(-50%, -50%)",
      zIndex: 10,
    },
    circle: { height: size, width: size },
    /** Space the page content needs below the banner. */
    contentPadding: `calc(${size} / 2 + 1.5rem)`,
  };
}
