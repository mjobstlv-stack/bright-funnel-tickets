import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPayplusStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: org } = await context.supabase
      .from("organizations")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!org) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: creds } = await supabaseAdmin
      .from("organization_payment_credentials")
      .select("payplus_api_key, payplus_secret_key, payplus_terminal_uid, payplus_payment_page_uid")
      .eq("organization_id", org.id)
      .maybeSingle();

    return {
      organization_id: org.id,
      api_key_set: !!creds?.payplus_api_key,
      secret_key_set: !!creds?.payplus_secret_key,
      terminal_uid_set: !!creds?.payplus_terminal_uid,
      payment_page_uid_set: !!creds?.payplus_payment_page_uid,
    };
  });

const SaveInput = z.object({
  api_key: z.string().nullable().optional(),
  secret_key: z.string().nullable().optional(),
  terminal_uid: z.string().nullable().optional(),
  payment_page_uid: z.string().nullable().optional(),
});

function clean(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined; // leave existing value
  const trimmed = (v ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export const savePayplusCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: org, error: orgErr } = await context.supabase
      .from("organizations")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (orgErr) throw new Error(orgErr.message);
    if (!org) throw new Error("No organization for current user");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, string | null> = {};
    const a = clean(data.api_key); if (a !== undefined) patch.payplus_api_key = a;
    const s = clean(data.secret_key); if (s !== undefined) patch.payplus_secret_key = s;
    const t = clean(data.terminal_uid); if (t !== undefined) patch.payplus_terminal_uid = t;
    const p = clean(data.payment_page_uid); if (p !== undefined) patch.payplus_payment_page_uid = p;

    const { error } = await supabaseAdmin
      .from("organization_payment_credentials")
      .upsert({ organization_id: org.id, ...patch }, { onConflict: "organization_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });