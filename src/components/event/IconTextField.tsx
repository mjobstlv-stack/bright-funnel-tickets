import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { IconPicker } from "@/components/event/IconPicker";
import { InlineIconText, hasInlineIcons, iconToken } from "@/components/event/inline-icons";
import { useLang } from "@/lib/i18n";

/**
 * Text field that lets the author drop icons inside the text itself.
 * The icon is inserted at the caret as an [icon:Name] token; spacing around it
 * is normalised automatically on render.
 */
export function IconTextField({
  value,
  onChange,
  placeholder,
  maxLength,
  userId,
  scopeId,
  multiline = false,
  rows = 2,
  preview = true,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  userId?: string | null;
  scopeId?: string | null;
  multiline?: boolean;
  rows?: number;
  preview?: boolean;
  className?: string;
}) {
  const { t } = useLang();
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  function insert(icon: string) {
    const el = ref.current;
    const token = iconToken(icon);
    const pos = el && typeof el.selectionStart === "number" ? el.selectionStart : value.length;
    const before = value.slice(0, pos).replace(/\s+$/, "");
    const after = value.slice(pos).replace(/^\s+/, "");
    const next = `${before}${before ? " " : ""}${token}${after ? " " : ""}${after}`;
    onChange(maxLength ? next.slice(0, maxLength) : next);
    requestAnimationFrame(() => {
      const caret = (before ? before.length + 1 : 0) + token.length;
      el?.focus();
      try { el?.setSelectionRange(caret, caret); } catch { /* noop */ }
    });
  }

  return (
    <div className={className}>
      <div className="flex items-start gap-2">
        {multiline ? (
          <textarea
            ref={(el) => { ref.current = el; }}
            rows={rows}
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        ) : (
          <Input
            ref={(el) => { ref.current = el; }}
            value={value}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        <IconPicker compact onChange={insert} userId={userId} scopeId={scopeId} />
      </div>
      {preview && hasInlineIcons(value) && (
        <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="shrink-0">{t("תצוגה:", "Preview:")}</span>
          <InlineIconText text={value} className="text-foreground" iconClassName="h-3.5 w-3.5" />
        </p>
      )}
    </div>
  );
}
