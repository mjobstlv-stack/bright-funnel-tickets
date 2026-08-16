import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

export const generateMeetLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load event + verify ownership through RLS
    const { data: ev, error: evErr } = await supabase
      .from("events")
      .select("id, name, description, start_at, end_at, org_id")
      .eq("id", data.eventId)
      .maybeSingle();
    if (evErr || !ev) throw new Error("Event not found");
    // RLS restricts this read to the organization's team members.

    const lovableKey = process.env.LOVABLE_API_KEY;
    const gcalKey = process.env.GOOGLE_CALENDAR_API_KEY;
    if (!lovableKey || !gcalKey) throw new Error("Google Calendar not connected");

    const start = ev.start_at ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const end = ev.end_at ?? new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();

    const requestId = `eos-${ev.id}-${Date.now()}`;
    const res = await fetch(`${GATEWAY}/calendars/primary/events?conferenceDataVersion=1`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gcalKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: ev.name,
        description: ev.description ?? undefined,
        start: { dateTime: start },
        end: { dateTime: end },
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${body.slice(0, 300)}`);
    const json = JSON.parse(body) as {
      id: string;
      hangoutLink?: string;
      conferenceData?: { entryPoints?: Array<{ entryPointType: string; uri: string }> };
    };
    const meetUrl =
      json.hangoutLink ??
      json.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
      null;
    if (!meetUrl) throw new Error("Meet link not returned by Google");

    const { error: upErr } = await supabase
      .from("events")
      .update({
        online_url: meetUrl,
        meeting_provider: "google_meet",
        meeting_event_id: json.id,
      })
      .eq("id", ev.id);
    if (upErr) throw upErr;

    return { url: meetUrl, id: json.id };
  });
