import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type ScrapeFailure =
  | "config_missing"
  | "timeout"
  | "rate_limited"
  | "blocked"
  | "private"
  | "not_found"
  | "network_error"
  | "empty_screenshot"
  | "http_error";

type ScrapedProfile = {
  url: string;
  source: "instagram" | "facebook";
  screenshot: string | null;
  error?: string;
  failure?: ScrapeFailure;
};

const SCRAPE_TIMEOUT_MS = 20_000;
const AI_TIMEOUT_MS = 30_000;

function classifyHttp(status: number): ScrapeFailure {
  if (status === 401 || status === 403) return "blocked";
  if (status === 404) return "not_found";
  if (status === 408 || status === 504) return "timeout";
  if (status === 429) return "rate_limited";
  return "http_error";
}

function failureLabel(f: ScrapeFailure): string {
  switch (f) {
    case "config_missing": return "Firecrawl not configured";
    case "timeout": return "Scrape timed out";
    case "rate_limited": return "Rate limited by Firecrawl";
    case "blocked": return "Profile blocked scraping (login wall / bot check)";
    case "private": return "Profile is private";
    case "not_found": return "Profile URL not found";
    case "network_error": return "Network error contacting Firecrawl";
    case "empty_screenshot": return "Firecrawl returned no screenshot";
    case "http_error": return "Firecrawl HTTP error";
  }
}

// Scrape a public IG/FB profile via Firecrawl and return a full-page screenshot
// data URL that Gemini vision can consume directly. Returns { screenshot: null,
// failure: <reason> } when the profile is private, blocked, timed out, or
// Firecrawl is unavailable — caller treats a failed image as an unsafe signal
// and flags the decision as "maybe" for manual review.
async function scrapeProfile(url: string, source: "instagram" | "facebook"): Promise<ScrapedProfile> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    return { url, source, screenshot: null, failure: "config_missing", error: failureLabel("config_missing") };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: [{ type: "screenshot", fullPage: true }],
        onlyMainContent: false,
        waitFor: 2500,
        timeout: SCRAPE_TIMEOUT_MS,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const failure = classifyHttp(res.status);
      let detail = "";
      try { detail = (await res.text()).slice(0, 200); } catch { /* ignore */ }
      if (/login|sign in|private|not.*public/i.test(detail)) {
        return { url, source, screenshot: null, failure: "private", error: `${failureLabel("private")} (${res.status})` };
      }
      return { url, source, screenshot: null, failure, error: `${failureLabel(failure)} (${res.status})` };
    }
    const j = (await res.json()) as { data?: { screenshot?: string }; screenshot?: string };
    const shot = j.data?.screenshot ?? j.screenshot ?? null;
    if (!shot) {
      return { url, source, screenshot: null, failure: "empty_screenshot", error: failureLabel("empty_screenshot") };
    }
    return { url, source, screenshot: shot };
  } catch (err) {
    const isAbort = err instanceof Error && (err.name === "AbortError" || /abort/i.test(err.message));
    const failure: ScrapeFailure = isAbort ? "timeout" : "network_error";
    return { url, source, screenshot: null, failure, error: isAbort ? failureLabel("timeout") : (err instanceof Error ? err.message : failureLabel("network_error")) };
  } finally {
    clearTimeout(timer);
  }
}

// When every requested profile failed to scrape, we cannot make a visual
// judgement — force a "maybe" so a human reviews it, and surface why.
function unsafeFromFailedScrapes(images: ScrapedProfile[]): AiDecision | null {
  if (images.length === 0) return null;
  const anySuccess = images.some((i) => i.screenshot);
  if (anySuccess) return null;
  const names: Record<string, string> = { instagram: "אינסטגרם", facebook: "פייסבוק" };
  const parts = images.map((i) => `${names[i.source] ?? i.source}: ${i.error ?? failureLabel(i.failure ?? "network_error")}`);
  return {
    decision: "maybe",
    score: 0,
    reasoning:
      `לא ניתן היה לבדוק את הפרופילים ויזואלית — הרשתות חסמו צילום אוטומטי (${parts.join("; ")}). ` +
      `הבקשה הזו נשלחה עם קישור לפרופיל ולא עם צילום מסך, ולכן ה-AI לא ראה תמונות ולא יכול להחליט. ` +
      `מה לעשות: פתחו את הפרופיל ידנית ואשרו/דחו כאן, או בקשו מהמבלה לשלוח בקשה חדשה עם צילום מסך של הפרופיל.`,
  };
}

function isProbablyUrl(v: string | null | undefined): v is string {
  return !!v && /^https?:\/\//i.test(v.trim());
}

// Guest-uploaded screenshots live in our own storage bucket — fetch them
// directly instead of sending them through the profile scraper.
function isStoredShot(v: string | null | undefined): v is string {
  return isProbablyUrl(v) && v.includes("/storage/v1/object/sign/");
}

async function loadStoredShot(url: string, source: "instagram" | "facebook"): Promise<ScrapedProfile> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { url, source, screenshot: null, failure: "network_error", error: `Stored screenshot unavailable (${res.status})` };
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (const b of buf) bin += String.fromCharCode(b);
    const type = res.headers.get("content-type") ?? "image/jpeg";
    return { url, source, screenshot: `data:${type};base64,${btoa(bin)}` };
  } catch (err) {
    return { url, source, screenshot: null, failure: "network_error", error: err instanceof Error ? err.message : "fetch failed" };
  }
}

type AiDecision = { decision: "approved" | "rejected" | "maybe"; score: number | null; reasoning: string };

async function callVisionDoorman(args: {
  apiKey: string;
  eventName: string;
  criteria: string;
  visualCriteria: string;
  buyerName?: string;
  buyerEmail?: string;
  instagramUrl: string | null;
  facebookUrl: string | null;
  images: ScrapedProfile[];
}): Promise<AiDecision> {
  const system = `You are a doorman for a private event. Decide whether to approve a guest based on:
1. The organizer's written criteria.
2. The organizer's VISUAL criteria (what to look for or reject in profile photos).
3. The guest's submitted profile URLs.
4. Screenshots of the guest's Instagram / Facebook profile pages (when available).

Rules:
- Judge the screenshots against the visual criteria (dress code, vibe, age band, style, content of posts, etc.) as best you can from what is visible.
- If a screenshot is missing (private profile, blocked, or scrape failed), say so in the reasoning and lean on text signals.
- If information is thin or ambiguous, decide "maybe" — never guess wildly.
- Return JSON ONLY. No markdown.

Return this exact shape:
{
  "decision": "approved" | "rejected" | "maybe",
  "score": integer 0-100 (confidence in decision),
  "reasoning": short string (2-4 sentences, in the same language as the organizer's criteria; mention visual signals explicitly)
}`;

  const textParts = `Event: ${args.eventName}

Organizer's approval criteria (text):
"""
${args.criteria || "(none provided)"}
"""

Organizer's VISUAL criteria (what to look for / reject in the profile photos):
"""
${args.visualCriteria || "(none provided)"}
"""

Guest submission:
- Name: ${args.buyerName ?? "(n/a)"}
- Email: ${args.buyerEmail ?? "(n/a)"}
- Instagram: ${args.instagramUrl ?? "(not provided)"}
- Facebook: ${args.facebookUrl ?? "(not provided)"}

Screenshots attached below (in order): ${args.images.map((i) => `${i.source}${i.screenshot ? "" : ` [MISSING: ${i.error ?? "no image"}]`}`).join(", ") || "(none)"}`;

  const content: Array<Record<string, unknown>> = [{ type: "text", text: textParts }];
  for (const img of args.images) {
    if (img.screenshot) {
      content.push({ type: "image_url", image_url: { url: img.screenshot } });
    }
  }

  const aiController = new AbortController();
  const aiTimer = setTimeout(() => aiController.abort(), AI_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${args.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
      signal: aiController.signal,
    });
  } catch (err) {
    const isAbort = err instanceof Error && (err.name === "AbortError" || /abort/i.test(err.message));
    throw new Error(isAbort ? "AI request timed out" : (err instanceof Error ? err.message : "AI request failed"));
  } finally {
    clearTimeout(aiTimer);
  }
  if (res.status === 429) throw new Error("Rate limit — try again shortly");
  if (res.status === 402) throw new Error("AI credits exhausted");
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { decision?: string; score?: number; reasoning?: string };
  const allowed = ["approved", "rejected", "maybe"] as const;
  const decision = (allowed as readonly string[]).includes(parsed.decision ?? "") ? (parsed.decision as typeof allowed[number]) : "maybe";
  const score = typeof parsed.score === "number" ? Math.max(0, Math.min(100, Math.round(parsed.score))) : null;
  const reasoning = String(parsed.reasoning ?? "").slice(0, 1500);
  return { decision, score, reasoning };
}

const SubmitInput = z.object({
  eventId: z.string().uuid(),
  ticketTypeId: z.string().uuid().nullable().optional(),
  buyerName: z.string().trim().min(1).max(120),
  buyerEmail: z.string().trim().email().max(255),
  buyerPhone: z.string().trim().max(40).nullable().optional(),
  instagramShot: z.string().max(8_000_000).nullable().optional(),
  facebookShot: z.string().max(8_000_000).nullable().optional(),
  quantity: z.number().int().min(1).max(10).optional(),
});

// Guests upload screenshots of their own profiles (IG/FB block scraping), so we
// persist the images in storage with the service-role client and keep a long
// signed URL on the request row for the reviewer + the AI doorman.
async function storeShot(
  admin: { storage: { from: (b: string) => { upload: (p: string, f: Blob, o?: unknown) => Promise<{ error: unknown }>; createSignedUrl: (p: string, s: number) => Promise<{ data: { signedUrl: string } | null }> } } },
  dataUrl: string,
  path: string,
): Promise<string | null> {
  const m = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: m[1] });
  const { error } = await admin.storage.from("event-media").upload(path, blob, { upsert: true, contentType: m[1] });
  if (error) return null;
  const { data } = await admin.storage.from("event-media").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? null;
}

export const submitTicketRequest = createServerFn({ method: "POST" })
  .inputValidator((d) => SubmitInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ev, error: evErr } = await supabaseAdmin
      .from("events")
      .select("id, status, requires_approval, require_instagram, require_facebook")
      .eq("id", data.eventId)
      .maybeSingle();
    if (evErr) throw new Error(evErr.message);
    if (!ev) throw new Error("Event not found");
    if (ev.status !== "published") throw new Error("Event is not published");
    if (!ev.requires_approval) throw new Error("This event does not require approval");
    if (ev.require_instagram && !data.instagramShot) throw new Error("Instagram profile screenshot is required");
    if (ev.require_facebook && !data.facebookShot) throw new Error("Facebook profile screenshot is required");
    if (!data.instagramShot && !data.facebookShot) throw new Error("At least one profile screenshot is required");

    const { data: rec, error } = await supabaseAdmin
      .from("ticket_requests")
      .insert({
        event_id: data.eventId,
        ticket_type_id: data.ticketTypeId ?? null,
        buyer_name: data.buyerName,
        buyer_email: data.buyerEmail,
        buyer_phone: data.buyerPhone ?? null,
        instagram_url: null,
        facebook_url: null,
        quantity: data.quantity ?? 1,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const igUrl = data.instagramShot ? await storeShot(supabaseAdmin as never, data.instagramShot, `requests/${rec.id}/instagram.jpg`) : null;
    const fbUrl = data.facebookShot ? await storeShot(supabaseAdmin as never, data.facebookShot, `requests/${rec.id}/facebook.jpg`) : null;
    if (igUrl || fbUrl) {
      await supabaseAdmin.from("ticket_requests").update({ instagram_url: igUrl, facebook_url: fbUrl }).eq("id", rec.id);
    }

    // Fire and forget AI screening — do not block the submit
    const uploaded: ScrapedProfile[] = [];
    if (data.instagramShot) uploaded.push({ url: igUrl ?? "(uploaded)", source: "instagram", screenshot: data.instagramShot });
    if (data.facebookShot) uploaded.push({ url: fbUrl ?? "(uploaded)", source: "facebook", screenshot: data.facebookShot });
    runScreening(rec.id, uploaded).catch(() => {});
    return { id: rec.id };
  });

// Internal-only helper. Not exposed as a server function to prevent
// unauthenticated callers from triggering AI runs, PII egress, or status
// writes by guessing a request UUID. Callers are already auth-gated
// (submitTicketRequest validates the event; rescreenTicketRequest requires
// org owner auth via RLS).
async function runScreening(requestId: string, uploaded?: ScrapedProfile[]): Promise<void> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rec, error } = await supabaseAdmin
      .from("ticket_requests")
      .select("id, event_id, buyer_name, buyer_email, instagram_url, facebook_url, status")
      .eq("id", requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!rec) throw new Error("Request not found");
    if (rec.status !== "pending" && rec.status !== "ai_reviewing") return;

    const { data: ev } = await supabaseAdmin
      .from("events")
      .select("name, approval_criteria, visual_criteria")
      .eq("id", rec.event_id)
      .maybeSingle();

    await supabaseAdmin.from("ticket_requests").update({ status: "ai_reviewing" }).eq("id", rec.id);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      await supabaseAdmin.from("ticket_requests").update({
        status: "maybe",
        ai_decision: "maybe",
        ai_reasoning: "AI not configured — manual review required.",
      }).eq("id", rec.id);
      return;
    }

    try {
      let images: ScrapedProfile[] = uploaded ?? [];
      if (images.length === 0) {
        if (isStoredShot(rec.instagram_url)) images = [...images, await loadStoredShot(rec.instagram_url, "instagram")];
        else if (isProbablyUrl(rec.instagram_url)) images = [...images, await scrapeProfile(rec.instagram_url, "instagram")];
        if (isStoredShot(rec.facebook_url)) images = [...images, await loadStoredShot(rec.facebook_url, "facebook")];
        else if (isProbablyUrl(rec.facebook_url)) images = [...images, await scrapeProfile(rec.facebook_url, "facebook")];
      }

      const unsafe = unsafeFromFailedScrapes(images);
      const result = unsafe ?? await callVisionDoorman({
        apiKey: key,
        eventName: ev?.name ?? "Unknown",
        criteria: (ev?.approval_criteria ?? "").trim(),
        visualCriteria: (ev?.visual_criteria ?? "").trim(),
        buyerName: rec.buyer_name,
        buyerEmail: rec.buyer_email,
        instagramUrl: rec.instagram_url,
        facebookUrl: rec.facebook_url,
        images,
      });

      await supabaseAdmin.from("ticket_requests").update({
        status: result.decision,
        ai_decision: result.decision,
        ai_score: result.score,
        ai_reasoning: result.reasoning,
      }).eq("id", rec.id);
      return;
    } catch (err) {
      await supabaseAdmin.from("ticket_requests").update({
        status: "maybe",
        ai_decision: "maybe",
        ai_reasoning: `AI screening failed: ${err instanceof Error ? err.message : "unknown"}. Please review manually.`,
      }).eq("id", rec.id);
      return;
    }
}

const DecideInput = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().max(2000).optional(),
});

export const decideTicketRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DecideInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify ownership via RLS-scoped read
    const { data: rec, error } = await supabase
      .from("ticket_requests")
      .select("id, event_id, buyer_name")
      .eq("id", data.requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!rec) throw new Error("Request not found or forbidden");

    const { error: upErr } = await supabase
      .from("ticket_requests")
      .update({
        status: data.decision,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: data.notes ?? null,
      })
      .eq("id", data.requestId);
    if (upErr) throw new Error(upErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveMembership, logActivity } = await import("./team.server");
    const membership = await resolveMembership(supabaseAdmin, userId);
    if (membership) {
      await logActivity(supabaseAdmin, {
        orgId: membership.orgId,
        userId,
        action: data.decision === "approved" ? "request.approved" : "request.rejected",
        entity: "ticket_request",
        entityId: rec.id,
        eventId: rec.event_id,
        summary: `${data.decision === "approved" ? "אישר/ה" : "דחה/תה"} בקשת כניסה — ${rec.buyer_name ?? ""}`,
      });
    }
    return { ok: true };
  });

const RescreenInput = z.object({ requestId: z.string().uuid() });
export const rescreenTicketRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => RescreenInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rec, error } = await supabase
      .from("ticket_requests")
      .select("id")
      .eq("id", data.requestId)
      .maybeSingle();
    if (error || !rec) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ticket_requests").update({ status: "pending", ai_decision: null, ai_score: null, ai_reasoning: null }).eq("id", data.requestId);
    await runScreening(data.requestId);
    return { ok: true };
  });

const TokenInput = z.object({
  requestId: z.string().uuid(),
  token: z.string().uuid(),
});

const TestInput = z.object({
  criteria: z.string().max(2000),
  visualCriteria: z.string().max(2000).optional(),
  instagramScreenshot: z.string().max(8_000_000).nullable().optional(),
  facebookScreenshot: z.string().max(8_000_000).nullable().optional(),
  eventName: z.string().max(200).optional(),
});

export const testApprovalCriteria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TestInput.parse(d))
  .handler(async ({ data }) => {
    if (!data.instagramScreenshot && !data.facebookScreenshot) {
      throw new Error("Upload at least one profile screenshot");
    }
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");

    const images: ScrapedProfile[] = [];
    if (data.instagramScreenshot) images.push({ url: "(uploaded)", source: "instagram", screenshot: data.instagramScreenshot });
    if (data.facebookScreenshot) images.push({ url: "(uploaded)", source: "facebook", screenshot: data.facebookScreenshot });

    const result = await callVisionDoorman({
      apiKey: key,
      eventName: data.eventName ?? "(test)",
      criteria: data.criteria.trim(),
      visualCriteria: (data.visualCriteria ?? "").trim(),
      instagramUrl: null,
      facebookUrl: null,
      images,
    });

    return {
      ...result,
      images: images.map((i) => ({
        source: i.source,
        url: i.url,
        screenshot: i.screenshot,
        error: i.error ?? null,
      })),
    };
  });

export const getRequestByToken = createServerFn({ method: "POST" })
  .inputValidator((d) => TokenInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rec, error } = await supabaseAdmin
      .from("ticket_requests")
      .select("id, event_id, ticket_type_id, buyer_name, buyer_email, buyer_phone, quantity, status, access_token, order_id")
      .eq("id", data.requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!rec || rec.access_token !== data.token) return null;
    if (rec.status !== "approved") return { request: { ...rec, access_token: undefined }, event: null, ticket_type: null, blocked: true as const };

    const { data: ev } = await supabaseAdmin
      .from("events")
      .select("id, name, slug, currency")
      .eq("id", rec.event_id)
      .maybeSingle();
    let tt = null as null | { id: string; name: string; price: number };
    if (rec.ticket_type_id) {
      const { data: t } = await supabaseAdmin
        .from("ticket_types")
        .select("id, name, price")
        .eq("id", rec.ticket_type_id)
        .maybeSingle();
      if (t) tt = { id: t.id, name: t.name, price: Number(t.price) };
    }
    return {
      request: {
        id: rec.id,
        event_id: rec.event_id,
        ticket_type_id: rec.ticket_type_id,
        buyer_name: rec.buyer_name,
        buyer_email: rec.buyer_email,
        buyer_phone: rec.buyer_phone,
        quantity: rec.quantity,
        status: rec.status,
      },
      event: ev,
      ticket_type: tt,
      blocked: false as const,
    };
  });

// List all "maybe" ticket requests across every event the caller owns,
// so reviewers can work a single queue instead of jumping between events.
const ListReviewInput = z.object({
  status: z.enum(["maybe", "pending", "approved", "rejected", "all"]).default("maybe"),
});
export const listReviewQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ListReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { resolveMembership } = await import("./team.server");
    const membership = await resolveMembership(supabaseAdmin, userId);
    if (!membership) return { events: [], requests: [] };
    const org = { id: membership.orgId };

    const { data: evs } = await supabaseAdmin
      .from("events")
      .select("id, name, slug, start_at")
      .eq("org_id", org.id);
    const eventIds = (evs ?? []).map((e) => e.id);
    if (eventIds.length === 0) return { events: [], requests: [] };

    let q = supabaseAdmin
      .from("ticket_requests")
      .select("id, event_id, buyer_name, buyer_email, buyer_phone, instagram_url, facebook_url, status, ai_score, ai_reasoning, created_at")
      .in("event_id", eventIds)
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status === "maybe") q = q.eq("status", "maybe");
    else if (data.status === "pending") q = q.in("status", ["pending", "ai_reviewing"]);
    else if (data.status !== "all") q = q.eq("status", data.status);

    const { data: reqs, error } = await q;
    if (error) throw new Error(error.message);
    return { events: evs ?? [], requests: reqs ?? [] };
  });
