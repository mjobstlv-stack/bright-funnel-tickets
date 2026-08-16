import { IconValue } from "@/components/event/IconPicker";
import { parseIconValue, iconGapCss } from "@/components/event/icon-style";
import type { ReactNode } from "react";

/**
 * Inline icon tokens inside plain text fields.
 * Syntax: [icon:Music]  or  [icon:https://…/my-icon.svg]
 * Rendering keeps baseline alignment and adds automatic spacing so authors
 * never need to fiddle with spaces (works in both LTR and RTL).
 */
const TOKEN = /\[icon:([^\]\s]+)\]/g;

export const ICON_TOKEN_HINT = "[icon:Music]";

export function iconToken(value: string) {
  return `[icon:${value}]`;
}

export function hasInlineIcons(text?: string | null) {
  return !!text && /\[icon:[^\]\s]+\]/.test(text);
}

/** Strips tokens — useful for meta descriptions, titles in <head>, alt text. */
export function stripInlineIcons(text?: string | null) {
  return (text ?? "").replace(TOKEN, "").replace(/\s{2,}/g, " ").trim();
}

/**
 * Renders text with inline icons. Spacing is normalised automatically:
 * a single space-width gap is inserted on the sides that touch text.
 */
export function InlineIconText({
  text,
  className,
  iconClassName = "h-[1.05em] w-[1.05em]",
}: {
  text?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  const raw = text ?? "";
  if (!raw) return null;
  if (!hasInlineIcons(raw)) return <span className={className}>{raw}</span>;

  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN.source, "g");
  let k = 0;
  while ((m = re.exec(raw))) {
    const before = raw.slice(last, m.index);
    const after = raw.slice(m.index + m[0].length);
    if (before) parts.push(<span key={`t${k}`}>{before.replace(/\s+$/, " ")}</span>);
    const needsStart = before.length > 0 && !/\s$/.test(before);
    const needsEnd = after.length > 0 && !/^\s/.test(after);
    const tokenStyle = parseIconValue(m[1]).style;
    const gapCss = iconGapCss(tokenStyle, { start: needsStart, end: needsEnd });
    parts.push(
      <span
        key={`i${k}`}
        style={gapCss}
        className={`inline-flex items-center align-[-0.15em] ${tokenStyle.gap == null && needsStart ? "ms-[0.28em]" : ""} ${tokenStyle.gap == null && needsEnd ? "me-[0.28em]" : ""}`}
      >
        <IconValue value={m[1]} className={iconClassName} />
      </span>,
    );
    last = m.index + m[0].length;
    k += 1;
  }
  const tail = raw.slice(last);
  if (tail) parts.push(<span key="tail">{tail.replace(/^\s+/, " ")}</span>);

  return <span className={className}>{parts}</span>;
}
