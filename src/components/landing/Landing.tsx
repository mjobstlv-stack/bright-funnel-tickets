import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/eventos-logo.svg.asset.json";
import landingCircle from "@/assets/landing-circle.jpg";
import { copy, type Lang, type LandingCopy } from "./content";
import { AccessibilityToolbar } from "./AccessibilityToolbar";


interface Props { lang: Lang }
type C = LandingCopy;

export function Landing({ lang }: Props) {
  const c = copy[lang];
  const isRtl = c.dir === "rtl";
  return (
    <div dir={c.dir} lang={c.langCode} className="min-h-screen bg-cream text-ink overflow-x-hidden font-sans" style={{ fontSize: "calc(1rem * var(--a11y-scale, 1))" }}>
      <style>{`
        @keyframes tickerMove { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes floaty { 0%,100% { transform: translateY(0) rotate(var(--rot,0deg)); } 50% { transform: translateY(-10px) rotate(var(--rot,0deg)); } }
        @keyframes countUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .a11y-high-contrast .bg-cream { background-color: #ffffff !important; color: #000000 !important; }
        .a11y-high-contrast .text-ink { color: #000000 !important; }
        .a11y-high-contrast .text-ink\/70, .a11y-high-contrast .text-ink\/75, .a11y-high-contrast .text-ink\/55, .a11y-high-contrast .text-ink\/65, .a11y-high-contrast .text-ink\/80, .a11y-high-contrast .text-ink\/60, .a11y-high-contrast .text-ink\/45, .a11y-high-contrast .text-ink\/85 { color: #000000 !important; }
        .a11y-high-contrast .bg-ink, .a11y-high-contrast .bg-leaf { background-color: #000000 !important; color: #ffffff !important; }
        .a11y-high-contrast .border-ink\/10, .a11y-high-contrast .border-ink\/15, .a11y-high-contrast .border-ink\/85, .a11y-high-contrast .border-ink\/20 { border-color: #000000 !important; }
        .a11y-high-contrast .bg-blush { background-color: #fff0f5 !important; }
        .a11y-high-contrast .bg-butter { background-color: #fff8dc !important; }
        .a11y-high-contrast .bg-leaf { background-color: #000000 !important; color: #ffffff !important; }
        .a11y-high-contrast .bg-cream { background-color: #ffffff !important; }
        .a11y-high-contrast .bg-cream\/90 { background-color: #ffffff !important; }
      `}</style>
      <Nav c={c} />
      <Hero c={c} isRtl={isRtl} />
      <Ticker c={c} />
      <CircleImage c={c} />
      <OneLiner c={c} />
      <Modules c={c} />
      <HowItWorks c={c} />
      <Pricing c={c} />
      <Faq c={c} />
      <FinalCta c={c} isRtl={isRtl} />
      <Footer c={c} />
      <AccessibilityToolbar labels={c.a11y} />

    </div>
  );
}

function LogoMark({ className = "h-9" }: { className?: string }) {
  return <img src={logoAsset.url} alt="Event OS" className={className} />;
}

function Pill({ children, href, tone = "solid", className = "" }: { children: React.ReactNode; href: string; tone?: "solid" | "outline"; className?: string }) {
  const base = "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5";
  const styles = tone === "solid" ? "bg-ink text-cream hover:bg-leaf" : "border-2 border-ink text-ink hover:bg-ink/5";
  return <a href={href} className={`${base} ${styles} ${className}`}>{children}</a>;
}

function Nav({ c }: { c: C }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur-xl border-b border-ink/10">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 h-20 flex items-center justify-between gap-6">
        <a href="#top" className="flex items-center gap-2.5 shrink-0">
          <LogoMark className="h-11 sm:h-12" />
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink/70">
          <a href="#platform" className="hover:text-ink transition">{c.nav.features}</a>
          <a href="#how" className="hover:text-ink transition">{c.nav.how}</a>
          <a href="#pricing" className="hover:text-ink transition">{c.nav.pricing}</a>
          <a href="#faq" className="hover:text-ink transition">{c.nav.faq}</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to={c.switchTo.href} className="hidden sm:inline-flex text-xs font-semibold text-ink/70 hover:text-ink transition px-3 h-8 items-center rounded-full border border-ink/20">
            {c.switchTo.label}
          </Link>
          <Link to="/auth" className="hidden sm:inline text-sm font-medium text-ink/70 hover:text-ink transition">{c.nav.login}</Link>
          <Link to="/auth" className="inline-flex items-center justify-center rounded-full bg-ink text-cream text-sm font-semibold px-5 py-2.5 hover:bg-leaf transition">
            {c.nav.cta}
          </Link>
          <button onClick={() => setOpen(!open)} className="md:hidden size-10 rounded-full border-2 border-ink flex items-center justify-center" aria-label="menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-ink/10 px-5 py-4 flex flex-col gap-3 text-sm font-medium bg-cream">
          <a href="#platform" onClick={() => setOpen(false)}>{c.nav.features}</a>
          <a href="#how" onClick={() => setOpen(false)}>{c.nav.how}</a>
          <a href="#pricing" onClick={() => setOpen(false)}>{c.nav.pricing}</a>
          <a href="#faq" onClick={() => setOpen(false)}>{c.nav.faq}</a>
          <Link to={c.switchTo.href} className="text-ink/60">{c.switchTo.label}</Link>
        </div>
      )}
    </header>
  );
}

function Sticker({
  children,
  rot = -4,
  tone = "blush",
  className = "",
  float = false,
}: { children: React.ReactNode; rot?: number; tone?: "blush" | "butter" | "leaf" | "cream" | "ink"; className?: string; float?: boolean }) {
  const tones: Record<string, string> = {
    blush: "bg-blush text-ink",
    butter: "bg-butter text-ink",
    leaf: "bg-leaf text-cream",
    cream: "bg-cream text-ink",
    ink: "bg-ink text-cream",
  };
  return (
    <div
      className={`rounded-[1.75rem] border-2 border-ink/85 shadow-[6px_6px_0_0_var(--ink)] ${tones[tone]} ${className}`}
      style={{
        ["--rot" as string]: `${rot}deg`,
        transform: `rotate(${rot}deg)`,
        animation: float ? "floaty 7s ease-in-out infinite" : undefined,
      }}
    >
      {children}
    </div>
  );
}

function Stamp({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border-2 border-ink px-4 h-9 text-[11px] font-bold uppercase tracking-[0.18em] ${className}`}>
      {children}
    </span>
  );
}

function SectionHead({ title, eyebrow, sub, center = true }: { title: string; eyebrow: string; sub?: string; center?: boolean }) {
  return (
    <div className={`mb-12 ${center ? "text-center mx-auto max-w-3xl" : "max-w-3xl"}`}>
      <Stamp className="text-ink/70">{eyebrow}</Stamp>
      <h2 className="mt-5 font-display text-4xl sm:text-5xl leading-[1.05] tracking-tight uppercase">{title}</h2>
      {sub && <p className="mt-4 text-base sm:text-lg text-ink/70 leading-relaxed">{sub}</p>}
    </div>
  );
}

function Hero({ c, isRtl }: { c: C; isRtl: boolean }) {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 pt-14 sm:pt-20 pb-20 sm:pb-28 text-center">
        <Stamp className="text-ink/70">{c.hero.stamp}</Stamp>
        <h1 className="mt-7 font-display uppercase text-[2.75rem] sm:text-7xl lg:text-[86px] leading-[0.95] tracking-tight">
          <span className="block">{c.hero.titleA}</span>
          <span className="block text-leaf">{c.hero.titleHighlight}</span>
        </h1>
        <p className="mt-7 mx-auto max-w-2xl text-base sm:text-lg text-ink/75 leading-[1.7]">{c.hero.sub}</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Pill href="/auth">{c.hero.primaryCta} {isRtl ? "←" : "→"}</Pill>
          <Pill href="#platform" tone="outline">{c.hero.secondaryCta}</Pill>
        </div>
        <p className="mt-5 text-xs font-medium text-ink/55">{c.hero.trustline}</p>

        <div className="relative mt-14 sm:mt-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
            <Sticker rot={-3} tone="blush" float className="p-6 text-start hover:rotate-0 transition-transform duration-300">
              <div className="text-3xl">🍽️</div>
              <div className="mt-3 font-display uppercase text-xl leading-tight">{c.ticker[1]}</div>
            </Sticker>
            <Sticker rot={2.5} tone="ink" float className="p-6 text-start lg:mt-8 hover:rotate-0 transition-transform duration-300">
              <div className="text-3xl">🗓️</div>
              <div className="mt-3 font-display uppercase text-xl leading-tight">{c.ticker[2]}</div>
            </Sticker>
            <Sticker rot={-2} tone="butter" float className="p-6 text-start hover:rotate-0 transition-transform duration-300">
              <div className="text-3xl">📦</div>
              <div className="mt-3 font-display uppercase text-xl leading-tight">{c.ticker[3]}</div>
            </Sticker>
            <Sticker rot={3.5} tone="leaf" float className="p-6 text-start lg:mt-8 hover:rotate-0 transition-transform duration-300">
              <div className="text-3xl">💰</div>
              <div className="mt-3 font-display uppercase text-xl leading-tight">{c.ticker[4]}</div>
            </Sticker>
          </div>
        </div>
      </div>
    </section>
  );
}

function Ticker({ c }: { c: C }) {
  const row = [...c.ticker, ...c.ticker];
  return (
    <div className="border-y-2 border-ink bg-ink text-cream py-3 overflow-hidden" dir="ltr">
      <div className="flex w-max gap-10 whitespace-nowrap" style={{ animation: "tickerMove 28s linear infinite" }}>
        {row.map((w, i) => (
          <span key={i} className="font-display uppercase text-lg sm:text-xl tracking-wide flex items-center gap-10">
            {w} <span className="opacity-50">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function CircleImage({ c }: { c: C }) {
  return (
    <div className="relative -mt-16 sm:-mt-20 mb-8 sm:mb-10 z-10 flex justify-center px-5">
      <div className="relative">
        <img
          src={landingCircle}
          alt={c.dir === "rtl" ? "עיצוב שולחן אירוע" : "Event table setting"}
          width={280}
          height={280}
          loading="lazy"
          className="w-44 h-44 sm:w-56 sm:h-56 lg:w-72 lg:h-72 rounded-full object-cover border-4 border-cream shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]"
        />
        <div className="absolute inset-0 rounded-full ring-2 ring-ink/10 pointer-events-none" />
      </div>
    </div>
  );
}

function useCountUp(target: number, duration = 1500) {

  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || started.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

function OneLiner({ c }: { c: C }) {
  return (
    <section className="py-20 sm:py-24 border-b-2 border-ink/15">
      <div className="mx-auto max-w-5xl px-5 sm:px-8 text-center">
        <SectionHead title={c.oneLiner.title} eyebrow={c.oneLiner.eyebrow} sub={c.oneLiner.sub} />
        <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-12">
          {c.oneLiner.stats.map((s) => (
            <StatCard key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  const numeric = parseInt(value, 10);
  const suffix = value.replace(/^-?\d+/, "");
  const { count, ref } = useCountUp(isNaN(numeric) ? 0 : numeric, 1500);
  const display = isNaN(numeric) ? value : `${count}${suffix}`;
  return (
    <div ref={ref} className="rounded-2xl border-2 border-ink/85 bg-cream p-6 sm:p-8" style={{ animation: "countUp 0.6s ease-out" }}>
      <div className="font-display text-4xl sm:text-6xl text-leaf">{display}</div>
      <div className="mt-2 text-sm font-semibold text-ink/70">{label}</div>
    </div>
  );
}

function Modules({ c }: { c: C }) {
  const [activeTab, setActiveTab] = useState(c.modules.tabs[0]);
  const filtered = useMemo(() => c.modules.items.filter((m) => m.tags.includes(activeTab)), [c.modules.items, activeTab, activeTab]);
  return (
    <section id="platform" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHead title={c.modules.title} eyebrow={c.modules.eyebrow} sub={c.modules.sub} />

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {c.modules.tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-5 py-2 text-sm font-semibold border-2 transition ${activeTab === tab ? "bg-ink text-cream border-ink" : "bg-cream text-ink border-ink/30 hover:border-ink"}`}
              aria-pressed={activeTab === tab}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((m, i) => (
            <Sticker
              key={m.title}
              rot={(i % 2 === 0 ? -1 : 1) * (1 + (i % 3) * 0.6)}
              tone={i % 4 === 1 ? "blush" : i % 4 === 3 ? "butter" : "cream"}
              className="p-6 flex flex-col hover:-translate-y-1 hover:rotate-0 transition-transform duration-300"
            >
              <div className="text-3xl">{m.icon}</div>
              <h3 className="mt-3 font-display uppercase text-xl leading-tight">{m.title}</h3>
              <p className="mt-2 text-sm leading-relaxed opacity-75">{m.desc}</p>
            </Sticker>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ c }: { c: C }) {
  return (
    <section id="how" className="py-24 sm:py-32 bg-ink text-cream">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-14 text-center mx-auto max-w-3xl">
          <span className="inline-flex items-center rounded-full border-2 border-cream/60 px-4 h-9 text-[11px] font-bold uppercase tracking-[0.18em]">{c.how.eyebrow}</span>
          <h2 className="mt-5 font-display uppercase text-4xl sm:text-5xl leading-[1.05] tracking-tight">{c.how.title}</h2>
        </div>
        <div className="grid gap-7 md:grid-cols-3">
          {c.how.steps.map((s, i) => (
            <div key={s.n} className="rounded-[1.75rem] border-2 border-cream/35 p-8 hover:border-cream/60 transition-colors" style={{ transform: `rotate(${i % 2 === 0 ? -1.5 : 1.5}deg)` }}>
              <div className="font-display text-6xl leading-none opacity-40">{s.n}</div>
              <h3 className="mt-4 font-display uppercase text-2xl leading-tight">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed opacity-75">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ c }: { c: C }) {
  return (
    <section id="pricing" className="py-24 sm:py-32 border-t-2 border-ink/15">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHead title={c.pricing.title} eyebrow={c.pricing.eyebrow} sub={c.pricing.sub} />
        <div className="grid gap-7 md:grid-cols-3 max-w-6xl mx-auto">
          {c.pricing.plans.map((p, i) => (
            <Sticker key={p.name} rot={p.featured ? 0 : i === 0 ? -2 : 2} tone={p.featured ? "ink" : "cream"} className={`p-7 flex flex-col hover:-translate-y-1 transition-transform duration-300 ${p.featured ? "md:-mt-4 md:mb-4" : ""}`}>
              <div className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">{p.name}</div>
              <p className="mt-2 text-sm opacity-75">{p.desc}</p>

              <div className="mt-5 space-y-4 flex-1">
                {([
                  { label: c.pricing.moduleLabels.events, mod: p.events },
                  { label: c.pricing.moduleLabels.restaurant, mod: p.restaurant },
                ] as const).map(({ label, mod }) => (
                  <div key={label} className="rounded-2xl border-2 border-current/20 p-4">
                    <div className="text-[0.7rem] font-bold uppercase tracking-[0.14em] opacity-70">{label}</div>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <div className="font-display text-3xl leading-none">{mod.price}</div>
                      <div className="text-xs opacity-65">{mod.per}</div>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-[0.82rem]">
                      {mod.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <span className="mt-1.5 size-1.5 rounded-full bg-current shrink-0 opacity-70" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {p.bundle && (
                  <div className={`rounded-2xl border-2 border-dashed p-4 ${p.featured ? "border-cream/70" : "border-ink/40"}`}>
                    <div className="text-[0.7rem] font-bold uppercase tracking-[0.14em] opacity-70">{c.pricing.moduleLabels.bundle}</div>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <div className="font-display text-3xl leading-none">{p.bundle.price}</div>
                      <div className="text-xs opacity-65">{p.bundle.per}</div>
                    </div>
                    <div className="mt-1.5 text-[0.8rem] font-semibold opacity-80">{p.bundle.note}</div>
                  </div>
                )}
              </div>
              <a
                href="/auth"
                className={`mt-7 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${p.featured ? "bg-cream text-ink hover:opacity-90" : "bg-ink text-cream hover:bg-leaf"}`}
              >
                {p.cta}
              </a>
            </Sticker>
          ))}
        </div>
        <p className="mt-10 text-center text-sm font-semibold text-ink/80">{c.pricing.ticketFeeNote}</p>
        <p className="mt-2 text-center text-xs text-ink/60">{c.pricing.note}</p>

        <div className="mt-16 max-w-6xl mx-auto">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-ink/60">{c.pricing.aiAddon.eyebrow}</div>
            <h3 className="mt-2 font-display text-2xl sm:text-3xl text-ink">{c.pricing.aiAddon.title}</h3>
            <p className="mt-2 text-sm text-ink/70">{c.pricing.aiAddon.sub}</p>
          </div>
          <div className="mt-8 grid gap-7 md:grid-cols-3">
            {c.pricing.aiAddon.tiers.map((t, i) => (
              <Sticker
                key={t.name}
                rot={t.featured ? 0 : i === 0 ? -1.5 : 1.5}
                tone={t.featured ? "ink" : "cream"}
                className="p-7 flex flex-col hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">{t.name}</div>
                <div className="mt-3 flex items-baseline gap-2">
                  <div className="font-display text-4xl leading-none">{t.price}</div>
                  <div className="text-xs opacity-65">{t.per}</div>
                </div>
                <div className="mt-2 text-sm font-semibold opacity-85">{t.quota}</div>
                <div className="text-[0.8rem] opacity-65">{t.overage}</div>
                <ul className="mt-4 space-y-1.5 text-[0.85rem] flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-1.5 size-1.5 rounded-full bg-current shrink-0 opacity-70" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Sticker>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq({ c }: { c: C }) {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <SectionHead title={c.faq.title} eyebrow={c.faq.eyebrow} />
        <div className="space-y-4">
          {c.faq.items.map((item) => (
            <details key={item.q} className="group rounded-[1.25rem] border-2 border-ink/85 bg-cream px-6 py-5 hover:shadow-[4px_4px_0_0_var(--ink)] transition-shadow">
              <summary className="flex items-center justify-between cursor-pointer list-none gap-6">
                <span className="text-base sm:text-lg font-semibold">{item.q}</span>
                <span className="size-8 rounded-full border-2 border-ink flex items-center justify-center shrink-0 group-open:bg-ink group-open:text-cream transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-open:rotate-45 transition"><path d="M12 5v14M5 12h14"/></svg>
                </span>
              </summary>
              <p className="mt-4 text-sm text-ink/75 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ c, isRtl }: { c: C; isRtl: boolean }) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Sticker rot={-1} tone="leaf" className="px-8 sm:px-14 py-16 sm:py-20 text-center">
          <h2 className="font-display uppercase text-4xl sm:text-5xl leading-[1.05] tracking-tight max-w-3xl mx-auto">{c.finalCta.title}</h2>
          <p className="mt-6 text-base sm:text-lg opacity-85 max-w-xl mx-auto">{c.finalCta.sub}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href="/auth" className="inline-flex items-center justify-center rounded-full bg-cream text-ink px-7 py-3.5 text-sm font-bold hover:-translate-y-0.5 transition-transform">
              {c.finalCta.primary} {isRtl ? "←" : "→"}
            </a>
            <a href="#pricing" className="inline-flex items-center justify-center rounded-full border-2 border-cream px-7 py-3.5 text-sm font-bold hover:-translate-y-0.5 transition-transform">
              {c.finalCta.secondary}
            </a>
          </div>
        </Sticker>
      </div>
    </section>
  );
}

function Footer({ c }: { c: C }) {
  const termsHref = c.langCode === "he" ? "/terms" : "/en/terms";
  return (
    <footer className="border-t-2 border-ink/15 bg-cream">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <LogoMark className="h-12" />
            <p className="mt-4 text-sm text-ink/70 max-w-xs leading-relaxed">{c.footer.tagline}</p>
          </div>
          {c.footer.cols.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-ink/80">{col.title}</div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}><a href="#platform" className="text-sm text-ink/65 hover:text-ink transition">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t-2 border-ink/15 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-ink/60">{c.footer.rights}</div>
          <div className="flex items-center gap-4">
            <Link to={termsHref} className="text-xs text-ink/60 hover:text-ink transition">{c.footer.terms}</Link>
            <Link to={c.switchTo.href} className="text-xs text-ink/60 hover:text-ink transition">{c.switchTo.label}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
