import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { EventGeneratorDialog } from "@/components/event/EventGeneratorDialog";

type Row = { id: string; name: string; slug: string; status: string; start_at: string | null };

export const Route = createFileRoute("/_authenticated/events/")({
  component: EventsList,
});

function EventsList() {
  const { user } = useAuth();
  const { t } = useLang();
  const [rows, setRows] = useState<Row[]>([]);
  const [genOpen, setGenOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: org } = await supabase.from("organizations").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (!org) return;
      const { data } = await supabase.from("events").select("id,name,slug,status,start_at").eq("org_id", org.id).not("slug", "like", "restaurant-ops-%").order("created_at", { ascending: false });
      setRows(data ?? []);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display tracking-tight">{t("אירועים", "Events")}</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="rounded-full text-muted-foreground">
            <Link to="/events/new"><Plus className="h-4 w-4 mx-1" /> {t("ידני", "Manual")}</Link>
          </Button>
          <Button onClick={() => setGenOpen(true)} className="rounded-full">
            <Sparkles className="h-4 w-4 mx-1" /> {t("אירוע חדש עם AI", "New event with AI")}
          </Button>
        </div>
      </div>
      <Card className="border-black/10 divide-y divide-black/5">
        {rows.length === 0 && <div className="p-8 text-sm text-muted-foreground">{t("אין עדיין אירועים.", "No events yet.")}</div>}
        {rows.map((r) => (
          <Link key={r.id} to="/events/$id" params={{ id: r.id }} className="flex items-center justify-between p-4 hover:bg-black/[0.02]">
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">/{r.slug} · {r.start_at ? new Date(r.start_at).toLocaleString() : t("ללא תאריך", "no date")}</div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.status}</span>
          </Link>
        ))}
      </Card>
      <EventGeneratorDialog open={genOpen} onOpenChange={setGenOpen} />
    </div>
  );
}