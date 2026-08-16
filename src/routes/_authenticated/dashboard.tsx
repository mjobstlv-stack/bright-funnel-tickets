import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar, Plus, Ticket, DollarSign, Users, TrendingUp, Wallet,
  ShieldCheck, ArrowUpRight, Clock, Receipt,
} from "lucide-react";
import { useLang } from "@/lib/i18n";

type EventRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  start_at: string | null;
  cover_url: string | null;
  currency: string;
};

type RecentOrder = {
  id: string;
  order_number: string | null;
  total: number;
  currency: string;
  status: string;
  buyer_name: string | null;
  created_at: string;
  event_id: string;
};

function money(n: number, cur = "ILS") {
  const sym = cur === "ILS" ? "\u20aa" : cur === "USD" ? "$" : cur === "EUR" ? "\u20ac" : cur + " ";
  return `${sym}${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [stats, setStats] = useState({ revenue: 0, ticketsSold: 0, orders: 0, expenses: 0, pendingRequests: 0 });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [orgName, setOrgName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: org } = await supabase.from("organizations").select("id,name").order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (!org) return setLoading(false);
      setOrgName(org.name);
      const { data: evs } = await supabase
        .from("events")
        .select("id,slug,name,status,start_at,cover_url,currency")
        .eq("org_id", org.id)
        .not("slug", "like", "restaurant-ops-%")
        .order("created_at", { ascending: false });
      setEvents(evs ?? []);
      const ids = (evs ?? []).map((e) => e.id);
      if (ids.length) {
        const [{ data: ords }, tixRes, expRes, reqRes, recentRes] = await Promise.all([
          supabase
          .from("orders")
          .select("total,status,event_id")
          .in("event_id", ids)
            .eq("status", "paid"),
          supabase
            .from("tickets")
            .select("id", { count: "exact", head: true })
            .in("event_id", ids),
          supabase
            .from("event_expenses")
            .select("amount")
            .in("event_id", ids),
          supabase
            .from("ticket_requests")
            .select("id", { count: "exact", head: true })
            .in("event_id", ids)
            .eq("status", "pending"),
          supabase
            .from("orders")
            .select("id,order_number,total,currency,status,buyer_name,created_at,event_id")
            .in("event_id", ids)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);
        const revenue = (ords ?? []).reduce((a, b) => a + Number(b.total), 0);
        const expenses = (expRes.data ?? []).reduce((a, b) => a + Number(b.amount), 0);
        setStats({
          revenue,
          ticketsSold: tixRes.count ?? 0,
          orders: (ords ?? []).length,
          expenses,
          pendingRequests: reqRes.count ?? 0,
        });
        setRecentOrders((recentRes.data ?? []) as RecentOrder[]);
      }
      setLoading(false);
    })();
  }, [user]);

  const now = Date.now();
  const upcoming = events
    .filter((e) => e.start_at && new Date(e.start_at).getTime() > now)
    .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime())
    .slice(0, 3);

  const net = stats.revenue - stats.expenses;

  const today = new Date().toLocaleDateString(lang === "he" ? "he-IL" : "en-US", {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="-m-2 sm:-m-4 rounded-3xl bg-neutral-100/70 p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl font-display tracking-tight">
            {t("ברוכה הבאה", "Welcome back")}{orgName ? ` · ${orgName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("מבט חי על הכנסות, כרטיסים ובקשות.", "Live view of revenue, tickets and requests.")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white border border-black/5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />{today}
          </span>
          {stats.pendingRequests > 0 && (
            <Button asChild variant="outline" className="rounded-full h-10 px-4 border-black/10 bg-white">
              <Link to="/reviews">
                <ShieldCheck className="h-4 w-4 mx-1.5" />
                {t(`${stats.pendingRequests} בקשות`, `${stats.pendingRequests} requests`)}
              </Link>
            </Button>
          )}
          <Button asChild className="rounded-full h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link to="/events/new"><Plus className="h-4 w-4 mx-1.5" /> {t("אירוע חדש", "New event")}</Link>
          </Button>
        </div>
      </div>

      {/* Top KPI row */}
      <div className="grid md:grid-cols-3 gap-4">
        <Stat big icon={<DollarSign className="h-4 w-4" />} label={t("הכנסות (שולם)", "Revenue (paid)")} value={money(stats.revenue)} tone="emerald" />
        <Stat icon={<Wallet className="h-4 w-4" />} label={t("הוצאות", "Expenses")} value={money(stats.expenses)} tone="amber" />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label={t("רווח נקי", "Net profit")} value={money(net)} tone={net >= 0 ? "emerald" : "rose"} />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={<Ticket className="h-4 w-4" />} label={t("כרטיסים שהונפקו", "Tickets issued")} value={stats.ticketsSold.toLocaleString()} tone="sky" />
        <Stat icon={<Users className="h-4 w-4" />} label={t("הזמנות ששולמו", "Paid orders")} value={stats.orders.toLocaleString()} tone="violet" />
        <Stat icon={<ShieldCheck className="h-4 w-4" />} label={t("בקשות ממתינות", "Pending requests")} value={stats.pendingRequests.toLocaleString()} tone="rose" />
      </div>

      {/* Upcoming + Recent orders */}
      <div className="grid lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 rounded-2xl bg-white border border-black/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-600" />{t("אירועים קרובים", "Upcoming events")}</h2>
            <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground">{t("לכל האירועים →", "View all →")}</Link>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("טוען…", "Loading…")}</p>
          ) : upcoming.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-black/10 bg-neutral-50 shadow-none">
              <Calendar className="h-7 w-7 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">{t("אין אירועים עתידיים", "No upcoming events")}</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcoming.map((e) => (
                <Link key={e.id} to="/events/$id" params={{ id: e.id }}>
                  <Card className="flex items-center gap-4 p-3 rounded-xl border-transparent bg-neutral-50 shadow-none hover:bg-neutral-100 transition-colors">
                    <div
                      className="h-16 w-24 rounded-lg shrink-0 bg-gradient-to-br from-pink-200 via-purple-100 to-sky-200"
                      style={e.cover_url ? { backgroundImage: `url(${e.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-full ${e.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{e.status}</span>
                        <span className="text-muted-foreground">{new Date(e.start_at!).toLocaleDateString(lang === "he" ? "he-IL" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <h3 className="mt-1 font-medium truncate">{e.name}</h3>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white border border-black/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Receipt className="h-4 w-4 text-emerald-600" />{t("הזמנות אחרונות", "Recent orders")}</h2>
          </div>
          <div>
            {recentOrders.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{t("אין עדיין הזמנות", "No orders yet")}</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{o.buyer_name || o.order_number || o.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString(lang === "he" ? "he-IL" : "en-US", { day: "numeric", month: "short" })}</p>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-sm font-semibold tabular-nums">{money(Number(o.total), o.currency)}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${o.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-muted-foreground"}`}>{o.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl bg-white border border-black/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t("האירועים שלך", "Your events")}</h2>
          <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground">{t("לכל האירועים →", "View all →")}</Link>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("טוען…", "Loading…")}</p>
        ) : events.length === 0 ? (
          <Card className="p-10 text-center border-dashed border-black/10 bg-neutral-50 shadow-none">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="mt-3 font-medium">{t("אין עדיין אירועים", "No events yet")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("צרי את האירוע הראשון שלך והתחילי למכור כרטיסים.", "Create your first event to start selling tickets.")}</p>
            <Button asChild className="mt-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link to="/events/new">{t("צרי אירוע", "Create event")}</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.slice(0, 6).map((e) => (
              <Link key={e.id} to="/events/$id" params={{ id: e.id }}>
                <Card className="overflow-hidden rounded-xl border-transparent bg-neutral-50 shadow-none hover:bg-neutral-100 transition-colors">
                  <div
                    className="aspect-[16/9] bg-gradient-to-br from-pink-200 via-purple-100 to-sky-200"
                    style={e.cover_url ? { backgroundImage: `url(${e.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                  />
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full ${e.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{e.status}</span>
                      {e.start_at && <span className="text-muted-foreground">{new Date(e.start_at).toLocaleDateString()}</span>}
                    </div>
                    <h3 className="mt-2 font-medium truncate">{e.name}</h3>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const TONES: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700",
  sky: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
};

function Stat({ icon, label, value, tone = "sky", big = false }: { icon: React.ReactNode; label: string; value: string; tone?: keyof typeof TONES; big?: boolean }) {
  return (
    <div className="rounded-2xl bg-white border border-black/5 p-5">
      <div className="flex items-center gap-2.5">
        <span className={`h-8 w-8 shrink-0 rounded-lg grid place-items-center ${TONES[tone]}`}>{icon}</span>
        <span className="text-sm font-medium text-muted-foreground truncate">{label}</span>
      </div>
      <div className={`mt-3 font-display tabular-nums truncate ${big ? "text-4xl" : "text-2xl"}`}>{value}</div>
    </div>
  );
}
