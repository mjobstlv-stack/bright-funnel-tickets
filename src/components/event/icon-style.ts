/**
 * Per-field icon styling: color, size and spacing.
 * Encoded inside the icon value itself so it travels with the field:
 *   "Music|c=#ff5533;s=1.4;g=0.5"
 *   "https://…/icon.svg|s=0.9"
 * `c` = color, `s` = size multiplier (em), `g` = side spacing (em).
 */
export type IconStyle = { color?: string; size?: number; gap?: number };

export const DEFAULT_ICON_STYLE: IconStyle = {};

export function parseIconValue(value?: string | null): { icon: string; style: IconStyle } {
  const raw = value ?? "";
  const at = raw.indexOf("|");
  if (at < 0) return { icon: raw, style: {} };
  const icon = raw.slice(0, at);
  const style: IconStyle = {};
  for (const part of raw.slice(at + 1).split(";")) {
    const [k, v] = part.split("=");
    if (!k || !v) continue;
    if (k === "c" && /^#[0-9a-f]{3,8}$/i.test(v)) style.color = v;
    if (k === "s") {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0 && n <= 4) style.size = n;
    }
    if (k === "g") {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0 && n <= 3) style.gap = n;
    }
  }
  return { icon, style };
}

export function serializeIconValue(icon: string, style: IconStyle): string {
  const parts: string[] = [];
  if (style.color) parts.push(`c=${style.color}`);
  if (style.size != null && style.size !== 1) parts.push(`s=${round(style.size)}`);
  if (style.gap != null) parts.push(`g=${round(style.gap)}`);
  return parts.length ? `${icon}|${parts.join(";")}` : icon;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export function hasIconStyle(style: IconStyle) {
  return !!style.color || (style.size != null && style.size !== 1) || style.gap != null;
}

/** Inline CSS for the icon itself (color + size). */
export function iconCss(style: IconStyle, baseEm = 1): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (style.color) css.color = style.color;
  if (style.size != null) {
    const em = `${round(baseEm * style.size)}em`;
    css.width = em;
    css.height = em;
  }
  return css;
}

/** Inline CSS for the wrapper (side spacing). */
export function iconGapCss(
  style: IconStyle,
  sides: { start: boolean; end: boolean },
): React.CSSProperties {
  if (style.gap == null) return {};
  const em = `${round(style.gap)}em`;
  return {
    marginInlineStart: sides.start ? em : undefined,
    marginInlineEnd: sides.end ? em : undefined,
  };
}
