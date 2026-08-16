import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ParsedEventContent = {
  includes: { icon?: string; text: string }[];
  faq: { question: string; answer: string }[];
  location: {
    address?: string;
    parking?: string;
    transit?: string;
    notes?: string;
    map_url?: string;
  };
  rules: string[];
};

const ALLOWED_ICONS = [
  "Music",
  "Mic",
  "Headphones",
  "PartyPopper",
  "Utensils",
  "Wine",
  "Gift",
  "Camera",
  "Users",
  "Star",
  "Trophy",
  "Heart",
  "MapPin",
  "Calendar",
  "Clock",
  "Ticket",
  "Video",
  "Sparkles",
  "Flame",
  "Sun",
  "Wifi",
  "Car",
  "Bus",
  "Train",
  "Accessibility",
  "Baby",
  "Dog",
  "Coffee",
  "Cake",
  "Beer",
  "IceCream",
  "Shirt",
  "Tent",
  "Tv",
  "Gamepad2",
  "Book",
];

export const parseEventContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string; text: string }) => {
    if (!input?.eventId || !input?.text) throw new Error("Missing input");
    if (input.text.length > 12000) throw new Error("Text too long");
    return input;
  })
  .handler(async ({ data, context }): Promise<ParsedEventContent> => {
    const { supabase, userId } = context;
    const { data: ev, error } = await supabase
      .from("events")
      .select("id")
      .eq("id", data.eventId)
      .maybeSingle();
    if (error || !ev) throw new Error("Event not found");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");

    const system = `You convert raw event landing-page text (any language, often Hebrew) into structured JSON for a ticketing site.

Return ONLY valid JSON in this exact shape (no markdown, no commentary):
{
  "includes": [{"icon": <one of: ${ALLOWED_ICONS.join(", ")}>, "text": string}],
  "faq": [{"question": string, "answer": string}],
  "location": {"address": string, "parking": string, "transit": string, "notes": string, "map_url": string},
  "rules": [string]
}

Rules:
- Preserve the original language (do not translate).
- "includes" = what the ticket gets you (food, drinks, music, activities). Pick the best matching icon name from the allowed list. 2–10 items max.
- "faq" = questions and answers a buyer would ask (dress code, age, parking policy, refunds, kosher, etc). Convert statements like "the event is alcohol-free" into Q/A form if natural. 0–10 items.
- "location" = address, parking instructions, public transit, and any access notes. Leave fields empty string if not mentioned. Extract map URL only if present.
- "rules" = short bullet sentences for "good to know / event rules" (cancellation, ID, late entry, smoking, etc). 0–10 items.
- Omit empty arrays' items rather than inventing content. If a section has nothing, return an empty array / empty object fields.
- Each string under 280 chars. Question under 140 chars.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.text },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("Rate limited — try again in a moment");
    if (res.status === 402) throw new Error("AI credits exhausted");
    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: Partial<ParsedEventContent>;
    try {
      parsed = JSON.parse(content) as Partial<ParsedEventContent>;
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    const iconSet = new Set(ALLOWED_ICONS);
    const includes = Array.isArray(parsed.includes)
      ? parsed.includes
          .filter((i) => i && typeof i.text === "string" && i.text.trim())
          .slice(0, 12)
          .map((i) => ({
            icon: i.icon && iconSet.has(i.icon) ? i.icon : "Sparkles",
            text: String(i.text).slice(0, 280),
          }))
      : [];
    const faq = Array.isArray(parsed.faq)
      ? parsed.faq
          .filter(
            (f) =>
              f &&
              typeof f.question === "string" &&
              typeof f.answer === "string" &&
              f.question.trim(),
          )
          .slice(0, 12)
          .map((f) => ({
            question: String(f.question).slice(0, 200),
            answer: String(f.answer).slice(0, 1200),
          }))
      : [];
    const rules = Array.isArray(parsed.rules)
      ? parsed.rules
          .filter((r) => typeof r === "string" && r.trim())
          .slice(0, 12)
          .map((r) => String(r).slice(0, 280))
      : [];
    const lo = (parsed.location ?? {}) as ParsedEventContent["location"];
    const location: ParsedEventContent["location"] = {
      address: typeof lo.address === "string" ? lo.address.slice(0, 300) : "",
      parking: typeof lo.parking === "string" ? lo.parking.slice(0, 500) : "",
      transit: typeof lo.transit === "string" ? lo.transit.slice(0, 500) : "",
      notes: typeof lo.notes === "string" ? lo.notes.slice(0, 500) : "",
      map_url: typeof lo.map_url === "string" ? lo.map_url.slice(0, 500) : "",
    };

    return { includes, faq, location, rules };
  });
