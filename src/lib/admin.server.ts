import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Admin = SupabaseClient<Database>;

/** The product modules a business can be switched on or off for. */
export const MODULES = ["events", "restaurant", "ai", "inventory"] as const;
export type ModuleKey = (typeof MODULES)[number];

/** Throws unless the signed-in user is a platform (system) administrator. */
export async function requirePlatformAdmin(admin: Admin, userId: string) {
  const { data } = await admin.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!data) throw new Error("Forbidden: platform admins only");
  return userId;
}