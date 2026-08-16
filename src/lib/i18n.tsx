import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DirectionProvider } from "@radix-ui/react-direction";

export type Lang = "he" | "en";

type Ctx = {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (he: string, en: string) => string;
};

const LangContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "app-lang";

function getInitial(): Lang {
  if (typeof window === "undefined") return "he";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "he" || v === "en") return v;
  } catch {}
  return "he";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("he");

  useEffect(() => {
    setLangState(getInitial());
  }, []);

  const dir = lang === "he" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", dir);
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === "he" ? "en" : "he");
  }, [lang, setLang]);

  const t = useCallback((he: string, en: string) => (lang === "he" ? he : en), [lang]);

  const value = useMemo<Ctx>(
    () => ({ lang, dir, setLang, toggle, t }),
    [lang, dir, setLang, toggle, t],
  );

  return (
    <LangContext.Provider value={value}>
      <DirectionProvider dir={dir}>{children}</DirectionProvider>
    </LangContext.Provider>
  );
}

export function useLang(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) {
    // Safe fallback so unwrapped components (public landing) still render.
    return {
      lang: "he",
      dir: "rtl",
      setLang: () => {},
      toggle: () => {},
      t: (he) => he,
    };
  }
  return ctx;
}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, toggle } = useLang();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-3 h-8 text-xs font-medium hover:bg-black/5 transition-colors ${className}`}
      aria-label="Toggle language"
    >
      {lang === "he" ? "EN" : "עב"}
    </button>
  );
}
