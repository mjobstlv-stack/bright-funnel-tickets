import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/events/new")({
  component: NewEvent,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Live typing sanitizer for the URL field: keeps dots, dashes and underscores,
 *  turns slashes/spaces into dashes (a URL address is a single path segment). */
function sanitizeSlugInput(s: string) {
  return s.toLowerCase().replace(/[\s/\\]+/g, "-").replace(/[^a-z0-9._-]/g, "");
}

function NewEvent() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { t } = useLang();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [eventType, setEventType] = useState<"physical" | "virtual" | "hybrid">("physical");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { data: org } = await supabase.from("organizations").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (!org) throw new Error("No organization");
      const finalSlug = slug || slugify(name) + "-" + Math.random().toString(36).slice(2, 6);
      const { data, error } = await supabase
        .from("events")
        .insert({
          org_id: org.id,
          name,
          slug: finalSlug,
          tagline: tagline || null,
          description: description || null,
          venue_name: eventType === "virtual" ? null : (venueName || null),
          venue_address: eventType === "virtual" ? null : (venueAddress || null),
          event_type: eventType,
          online_url: eventType === "physical" ? null : (onlineUrl || null),
          meeting_provider: eventType === "physical" ? null : (onlineUrl ? "manual" : null),
          start_at: startAt ? new Date(startAt).toISOString() : null,
          end_at: endAt ? new Date(endAt).toISOString() : null,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success(t("האירוע נוצר", "Event created"));
      nav({ to: "/events/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("יצירת האירוע נכשלה", "Failed to create event"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-display tracking-tight">{t("יצירת אירוע חדש", "Create a new event")}</h1>
      <p className="mt-2 text-muted-foreground">{t("אפשר לערוך את כל זה אחר כך. כרטיסים מתווספים לאחר יצירת האירוע.", "You can edit any of this later. Tickets are added after you create the event.")}</p>
      <Card className="mt-6 p-8 border-black/10 shadow-sm">
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <Label>{t("פורמט האירוע *", "Event format *")}</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(["physical", "virtual", "hybrid"] as const).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setEventType(tp)}
                  className={`h-11 rounded-full border text-sm capitalize transition ${eventType === tp ? "bg-black text-white border-black" : "border-black/15 hover:border-black/40"}`}
                >{tp === "physical" ? t("פיזי", "In-person") : tp === "virtual" ? t("אונליין", "Online") : t("היברידי", "Hybrid")}</button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("שם האירוע *", "Event name *")}</Label>
            <Input required value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("קישור ישיר לאירוע *", "Event page link *")}</Label>
            <Input
              required
              type="text"
              dir="ltr"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={slug}
              onChange={(e) => setSlug(sanitizeSlugInput(e.currentTarget.value))}
              className="mt-1.5 text-left"
            />
            <p className="text-xs text-muted-foreground mt-1" dir="ltr">https://bright-funnel-lab.lovable.app/e/{slug || "your-event"}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("מותר: אותיות לטיניות, מספרים, נקודות, קווים תחתונים ומקפים. רווחים וסלאשים יומרו למקפים.", "Allowed: Latin letters, numbers, dots, underscores and dashes. Spaces and slashes become dashes.")}</p>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("סלוגן", "Tagline")}</Label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("תיאור", "Description")}</Label>
            <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" />
          </div>
          {eventType !== "virtual" && (<>
          <div>
            <Label>{t("שם המקום", "Venue name")}</Label>
            <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>{t("כתובת המקום", "Venue address")}</Label>
            <Input value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} className="mt-1.5" />
          </div>
          </>)}
          {eventType !== "physical" && (
            <div className="sm:col-span-2">
              <Label>{t("קישור לפגישה אונליין (אפשר להשאיר ריק)", "Online meeting link (optional now)")}</Label>
              <Input placeholder="https://meet.google.com/... or Zoom / Teams URL" value={onlineUrl} onChange={(e) => setOnlineUrl(e.target.value)} className="mt-1.5" />
              <p className="text-xs text-muted-foreground mt-1">{t("אם ריק, ניצור קישור Google Meet אוטומטי מדף האירוע.", "Leave empty to auto-generate a Google Meet link from the event page.")}</p>
            </div>
          )}
          <div>
            <Label>{t("מתחיל ב", "Starts at")}</Label>
            <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>{t("מסתיים ב", "Ends at")}</Label>
            <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy} className="rounded-full h-11 px-6">{busy ? t("יוצר…", "Creating…") : t("יצירת אירוע →", "Create event →")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}