import { useEffect, useState } from "react";

const STORAGE_KEY = "eventos-a11y";

export function AccessibilityToolbar({
  labels,
}: {
  labels: { open: string; fontSize: string; highContrast: string; reset: string; close: string };
}) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setScale(parsed.scale ?? 1);
      setHighContrast(parsed.highContrast ?? false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scale, highContrast }));
    document.documentElement.style.setProperty("--a11y-scale", String(scale));
    if (highContrast) {
      document.documentElement.classList.add("a11y-high-contrast");
    } else {
      document.documentElement.classList.remove("a11y-high-contrast");
    }
  }, [scale, highContrast]);

  return (
    <div className="fixed bottom-6 left-6 z-50" dir="rtl">
      {open ? (
        <div
          className="bg-cream border-2 border-ink rounded-2xl shadow-[6px_6px_0_0_var(--ink)] p-4 w-56"
          dir="auto"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold">{labels.open}</span>
            <button
              onClick={() => setOpen(false)}
              className="size-8 rounded-full border-2 border-ink flex items-center justify-center hover:bg-ink/5"
              aria-label={labels.close}
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs font-semibold opacity-70 block mb-2">{labels.fontSize}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScale((s) => Math.max(0.85, s - 0.15))}
                  className="size-9 rounded-full border-2 border-ink font-bold hover:bg-ink/5"
                  aria-label="smaller"
                >
                  −
                </button>
                <span className="text-sm font-semibold flex-1 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale((s) => Math.min(1.5, s + 0.15))}
                  className="size-9 rounded-full border-2 border-ink font-bold hover:bg-ink/5"
                  aria-label="larger"
                >
                  +
                </button>
              </div>
            </div>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-semibold opacity-70">{labels.highContrast}</span>
              <button
                onClick={() => setHighContrast((v) => !v)}
                role="switch"
                aria-checked={highContrast}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 border-ink transition ${highContrast ? "bg-ink" : "bg-cream"}`}
              >
                <span
                  className={`inline-block size-4 rounded-full bg-current transition-transform ${highContrast ? "translate-x-5" : "translate-x-1"}`}
                />
              </button>
            </label>

            <button
              onClick={() => {
                setScale(1);
                setHighContrast(false);
              }}
              className="w-full rounded-full border-2 border-ink text-sm font-semibold py-2 hover:bg-ink/5"
            >
              {labels.reset}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-ink text-cream px-4 py-3 text-sm font-bold shadow-[4px_4px_0_0_var(--ink)] border-2 border-cream hover:-translate-y-0.5 transition-transform"
          aria-label={labels.open}
        >
          ♿ {labels.open}
        </button>
      )}
    </div>
  );
}
