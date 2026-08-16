import { readOverlay, type CoverOverlay, type LogoSpot } from "./logo-placement";

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function srgb(c: number) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function luminance([r, g, b]: Rgb) {
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}

export function contrastRatio(a: Rgb, b: Rgb) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Alpha of the overlay gradient at a vertical position (0 = top, 100 = bottom). */
export function overlayAlphaAt(o: CoverOverlay, yPct: number): number {
  const a = Math.min(95, Math.max(0, o.intensity)) / 100;
  if (a <= 0) return 0;
  const y = Math.min(100, Math.max(0, yPct)) / 100;
  switch (o.direction) {
    case "full":
      return a;
    case "top": {
      // a at top -> a*0.55 at 45% -> 0 at bottom
      if (y <= 0.45) return a + (a * 0.55 - a) * (y / 0.45);
      return a * 0.55 * (1 - (y - 0.45) / 0.55);
    }
    case "center": {
      // radial from the middle outwards
      const d = Math.min(1, Math.abs(y - 0.5) / 0.5);
      if (d <= 0.7) return a + (a * 0.35 - a) * (d / 0.7);
      return a * 0.35 * (1 - (d - 0.7) / 0.3);
    }
    case "bottom":
    default: {
      const up = 1 - y; // distance from the bottom
      if (up <= 0.45) return a + (a * 0.55 - a) * (up / 0.45);
      return a * 0.55 * (1 - (up - 0.45) / 0.55);
    }
  }
}

export function blend(base: Rgb, over: Rgb, alpha: number): Rgb {
  const f = Math.min(1, Math.max(0, alpha));
  return [
    Math.round(base[0] * (1 - f) + over[0] * f),
    Math.round(base[1] * (1 - f) + over[1] * f),
    Math.round(base[2] * (1 - f) + over[2] * f),
  ] as Rgb;
}

type SampleResult = { color: Rgb; ok: boolean };

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function averagePixels(data: Uint8ClampedArray, opaqueOnly: boolean): SampleResult {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (opaqueOnly && a < 128) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  if (!n) return { color: [128, 128, 128], ok: false };
  return { color: [Math.round(r / n), Math.round(g / n), Math.round(b / n)], ok: true };
}

/** Average color of the cover image inside the box the logo occupies. */
export async function sampleCoverColor(src: string, spot: LogoSpot, box = 0.28): Promise<SampleResult> {
  const img = await loadImage(src);
  if (!img) return { color: [128, 128, 128], ok: false };
  const canvas = document.createElement("canvas");
  const w = 64, h = 64;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { color: [128, 128, 128], ok: false };
  const halfW = (img.naturalWidth * box) / 2;
  const halfH = (img.naturalHeight * box) / 2;
  const cx = img.naturalWidth * (Math.min(100, Math.max(0, spot.x)) / 100);
  const cy = img.naturalHeight * (Math.min(100, Math.max(0, spot.y)) / 100);
  const sx = Math.max(0, Math.min(img.naturalWidth - 1, cx - halfW));
  const sy = Math.max(0, Math.min(img.naturalHeight - 1, cy - halfH));
  const sw = Math.max(1, Math.min(img.naturalWidth - sx, halfW * 2));
  const sh = Math.max(1, Math.min(img.naturalHeight - sy, halfH * 2));
  try {
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    return averagePixels(ctx.getImageData(0, 0, w, h).data, false);
  } catch {
    return { color: [128, 128, 128], ok: false };
  }
}

/** Average color of the visible (non-transparent) pixels of the logo. */
export async function sampleLogoColor(src: string): Promise<SampleResult> {
  const img = await loadImage(src);
  if (!img) return { color: [255, 255, 255], ok: false };
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { color: [255, 255, 255], ok: false };
  try {
    ctx.drawImage(img, 0, 0, 64, 64);
    return averagePixels(ctx.getImageData(0, 0, 64, 64).data, true);
  } catch {
    return { color: [255, 255, 255], ok: false };
  }
}

export type ContrastVerdict = "pass" | "warn" | "fail";

export function verdictOf(ratio: number): ContrastVerdict {
  if (ratio >= 4.5) return "pass";
  if (ratio >= 3) return "warn";
  return "fail";
}

export type ContrastReport = {
  ratio: number;
  verdict: ContrastVerdict;
  backdrop: Rgb;
  logo: Rgb;
  /** Lowest overlay intensity (0-95, step 5) that reaches AA 4.5:1, or null if none does. */
  suggestedIntensity: number | null;
  exact: boolean;
};

export function buildReport({
  coverColor,
  logoColor,
  overlay,
  spot,
  exact,
}: {
  coverColor: Rgb;
  logoColor: Rgb;
  overlay: CoverOverlay;
  spot: LogoSpot;
  exact: boolean;
}): ContrastReport {
  const o = readOverlay({ overlay });
  const overlayRgb = hexToRgb(o.color);
  const at = (intensity: number) =>
    blend(coverColor, overlayRgb, overlayAlphaAt({ ...o, intensity }, spot.y));
  const backdrop = at(o.intensity);
  const ratio = contrastRatio(logoColor, backdrop);

  let suggested: number | null = null;
  for (let i = 0; i <= 95; i += 5) {
    if (contrastRatio(logoColor, at(i)) >= 4.5) {
      suggested = i;
      break;
    }
  }
  return { ratio, verdict: verdictOf(ratio), backdrop, logo: logoColor, suggestedIntensity: suggested, exact };
}