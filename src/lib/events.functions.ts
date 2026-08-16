import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

// Returns the full event row (including private meeting fields) to the owner.
// The public Data API hides online_url / meeting_* columns from clients; owner
// UI must go through this server fn.
export const getEventForOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string }) => input)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ev, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", data.eventId)
      .maybeSingle();
    if (error) throw error;
    if (!ev) return null;
    const { userHasOrgAccess } = await import("@/lib/team.server");
    if (!(await userHasOrgAccess(supabaseAdmin, userId, (ev as EventRow).org_id))) {
      throw new Error("Forbidden");
    }
    return ev as EventRow;
  });
