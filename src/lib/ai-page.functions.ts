import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type GenInput = {
  eventId: string;
  prompt: string;
  language?: "en" | "he";
  eventCategory?: "concert" | "conference" | "festival";
  logoUrl?: string;
  brandBookUrl?: string;
  brandBookMime?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
};

type GenOutput = {
  name: string;
  tagline: string;
  description: string;
  template: "classic" | "poster" | "split" | "minimal" | "immersive";
  bg_color?: string;
  text_color?: string;
  highlights?: Array<{ icon?: string; title: string; description?: string }>;
  includes?: Array<{ icon?: string; text: string }>;
  faq?: Array<{ question: string; answer: string }>;
  rules?: string[];
  schedule?: Array<{ time?: string; title: string; description?: string }>;
};

export const generateEventPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: GenInput) => {
    if (!input?.eventId) throw new Error("Missing eventId");
    if (!input?.prompt || input.prompt.trim().length < 3) throw new Error("Missing prompt");
    if (input.prompt.length > 3000) throw new Error("Prompt too long");
    return input;
  })
  .handler(async ({ data, context }): Promise<GenOutput> => {
    const { supabase, userId } = context;
    const { data: ev, error } = await supabase
      .from("events")
      .select("id")
      .eq("id", data.eventId)
      .maybeSingle();
    if (error || !ev) throw new Error("Event not found");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");

    const language = data.language === "he" ? "Hebrew" : "English";
    const category = data.eventCategory ?? "concert";
    const categoryGuide: Record<string, string> = {
      concert:
        "A concert / party / DJ set. Energetic, bold, sensory. Prefer template 'poster' or 'immersive'. Dark moody backgrounds work well.",
      conference:
        "A professional conference / webinar / lecture. Clean, credible, informative. Prefer template 'split' or 'minimal'. Light neutral backgrounds.",
      festival:
        "A festival with multiple acts / experiences. Rich, layered, cinematic. Prefer template 'immersive' or 'classic'. Warm cinematic tones.",
    };

    const refs: string[] = [];
    if (data.websiteUrl) refs.push(`Website: ${data.websiteUrl}`);
    if (data.instagramUrl) refs.push(`Instagram: ${data.instagramUrl}`);
    if (data.facebookUrl) refs.push(`Facebook: ${data.facebookUrl}`);
    const refBlock = refs.length
      ? `\n\nBrand references (for tone/voice inspiration only):\n${refs.join("\n")}`
      : "";

    const system = `You are an expert event marketer generating a full landing page in ${language}.
Category: ${category}. ${categoryGuide[category]}

If a logo image is attached: extract the dominant brand colors from it and use them as bg_color (hex) and text_color (hex) — ensure high contrast (WCAG AA). If a brand book is attached, follow its palette/tone. Otherwise pick colors that fit the category vibe.

Return ONLY valid JSON (no markdown, no commentary) matching this exact shape:
{
  "name": string (max 80 chars),
  "tagline": string (max 140 chars),
  "description": string (2-4 short paragraphs separated by double newlines, max 1000 chars),
  "template": one of "classic"|"poster"|"split"|"minimal"|"immersive",
  "bg_color": "#RRGGBB",
  "text_color": "#RRGGBB",
  "highlights": [{"icon": lucide-icon-name-in-PascalCase, "title": string, "description": string}] (3-5 items),
  "includes": [{"icon": lucide-icon-name-in-PascalCase, "text": string}] (3-6 items),
  "faq": [{"question": string, "answer": string}] (3-5 items),
  "rules": [string] (3-6 items),
  "schedule": [{"time": "HH:MM", "title": string, "description": string}] (3-6 items for concerts/festivals, empty [] for simple webinars)
}
Valid lucide icon names include: Music, Mic, Star, Heart, Zap, Sparkles, Coffee, Utensils, Wine, Ticket, Users, Calendar, MapPin, Clock, Gift, Shield, Award, Trophy, Camera, Video, Headphones, PartyPopper, Cake, Flame, Sun, Moon, TreePine, Wifi, Car, Bus, Train, Accessibility, Baby, Dog.${refBlock}`;

    // Build multimodal user content
    const userContent: Array<Record<string, unknown>> = [{ type: "text", text: data.prompt }];
    const isSvg = (u: string) => /\.svg(\?|$)/i.test(u);
    if (data.logoUrl && !isSvg(data.logoUrl)) {
      userContent.push({ type: "image_url", image_url: { url: data.logoUrl } });
      userContent.push({
        type: "text",
        text: "^ This is the brand logo — extract colors from it.",
      });
    }
    if (data.brandBookUrl) {
      const mime = (data.brandBookMime || "").toLowerCase();
      if (mime.startsWith("image/") && mime !== "image/svg+xml" && !isSvg(data.brandBookUrl)) {
        userContent.push({ type: "image_url", image_url: { url: data.brandBookUrl } });
        userContent.push({
          type: "text",
          text: "^ This is the brand book — follow its palette/tone.",
        });
      } else if (mime === "application/pdf" || /\.pdf(\?|$)/i.test(data.brandBookUrl)) {
        try {
          // SSRF guard: only allow fetching from our own Supabase storage host.
          const supaHost = new URL(process.env.SUPABASE_URL || "https://invalid.invalid").host;
          let parsed: URL;
          try {
            parsed = new URL(data.brandBookUrl);
          } catch {
            throw new Error("Invalid brandBookUrl");
          }
          if (
            parsed.protocol !== "https:" ||
            parsed.host !== supaHost ||
            !parsed.pathname.startsWith("/storage/")
          ) {
            throw new Error("brandBookUrl must be a Supabase storage URL");
          }
          const pdfRes = await fetch(parsed.toString());
          if (pdfRes.ok) {
            const buf = new Uint8Array(await pdfRes.arrayBuffer());
            if (buf.byteLength < 8 * 1024 * 1024) {
              let bin = "";
              for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
              const b64 = btoa(bin);
              userContent.push({
                type: "file",
                file: {
                  filename: "brand-book.pdf",
                  file_data: `data:${mime || "application/pdf"};base64,${b64}`,
                },
              });
              userContent.push({
                type: "text",
                text: "^ Brand book PDF — follow its palette/tone.",
              });
            }
          }
        } catch {
          // Fail silently — brand book is optional context
        }
      }
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (res.status === 429) throw new Error("Rate limited — try again in a moment");
    if (res.status === 402)
      throw new Error("AI credits exhausted — add credits in workspace settings");
    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: GenOutput;
    try {
      parsed = JSON.parse(content) as GenOutput;
    } catch {
      throw new Error("AI returned invalid JSON");
    }
    const allowed = ["classic", "poster", "split", "minimal", "immersive"] as const;
    const template = allowed.includes(parsed.template) ? parsed.template : "classic";
    const hex = (v: unknown) =>
      typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : undefined;
    const safeArr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
    return {
      name: String(parsed.name ?? "").slice(0, 120),
      tagline: String(parsed.tagline ?? "").slice(0, 200),
      description: String(parsed.description ?? "").slice(0, 5000),
      template,
      bg_color: hex(parsed.bg_color),
      text_color: hex(parsed.text_color),
      highlights: safeArr<{ icon?: string; title: string; description?: string }>(
        parsed.highlights,
      ).slice(0, 6),
      includes: safeArr<{ icon?: string; text: string }>(parsed.includes).slice(0, 8),
      faq: safeArr<{ question: string; answer: string }>(parsed.faq).slice(0, 8),
      rules: safeArr<string>(parsed.rules).slice(0, 8),
      schedule: safeArr<{ time?: string; title: string; description?: string }>(
        parsed.schedule,
      ).slice(0, 10),
    };
  });
