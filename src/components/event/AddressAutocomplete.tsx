import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type Suggestion = { placeId: string; text: string };

let loaderPromise: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as unknown as { google?: { maps?: unknown } };
  if (w.google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
    string | undefined;
  if (!key) return Promise.reject(new Error("Missing Google Maps browser key"));
  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-gmaps="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const s = document.createElement("script");
    s.async = true;
    s.defer = true;
    s.dataset.gmaps = "1";
    const params = new URLSearchParams({ key, loading: "async", libraries: "places", v: "weekly" });
    if (channel) params.set("channel", channel);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return loaderPromise;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  lang = "he",
  dir,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (v: string) => void;
  placeholder?: string;
  lang?: string;
  dir?: "rtl" | "ltr";
}) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const tokenRef = useRef<unknown>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMaps().catch(() => {});
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        await loadMaps();
        const g = (
          window as unknown as {
            google: { maps: { importLibrary: (n: string) => Promise<unknown> } };
          }
        ).google;
        const places = (await g.maps.importLibrary("places")) as {
          AutocompleteSuggestion: {
            fetchAutocompleteSuggestions: (req: unknown) => Promise<{ suggestions: unknown[] }>;
          };
          AutocompleteSessionToken: new () => unknown;
        };
        if (!tokenRef.current) tokenRef.current = new places.AutocompleteSessionToken();
        const res = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          sessionToken: tokenRef.current,
          language: lang,
        });
        if (cancelled) return;
        const mapped: Suggestion[] = res.suggestions
          .map((s) => {
            const p = (s as { placePrediction?: { placeId?: string; text?: { text?: string } } })
              .placePrediction;
            if (!p?.placeId || !p.text?.text) return null;
            return { placeId: p.placeId, text: p.text.text };
          })
          .filter((x): x is Suggestion => !!x);
        setItems(mapped);
        setOpen(mapped.length > 0);
      } catch {
        // silent
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [value, lang]);

  const pick = (s: Suggestion) => {
    onChange(s.text);
    onSelect?.(s.text);
    setOpen(false);
    tokenRef.current = null;
  };

  return (
    <div className="relative" ref={boxRef}>
      <Input
        value={value}
        placeholder={placeholder}
        dir={dir}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (items.length) setOpen(true);
        }}
        autoComplete="off"
      />
      {open && items.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-black/10 bg-white shadow-lg">
          {items.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="w-full text-start px-3 py-2 text-sm hover:bg-black/5"
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
