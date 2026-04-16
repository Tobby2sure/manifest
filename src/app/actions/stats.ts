"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface LandingStats {
  intents: number;
  builders: number;
  ecosystems: number;
}

/**
 * Get live stats for the landing page.
 * Returns null if numbers are too low to display meaningfully.
 */
export async function getLandingStats(): Promise<LandingStats | null> {
  const supabase = createAdminClient();

  const [intentRes, profileRes, ecosystemRes] = await Promise.all([
    supabase.from("intents").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("intents").select("ecosystem").not("ecosystem", "is", null),
  ]);

  const intents = intentRes.count ?? 0;
  const builders = profileRes.count ?? 0;
  const ecosystems = new Set(
    (ecosystemRes.data ?? []).map((r: { ecosystem: string }) => r.ecosystem)
  ).size;

  // Hide the strip if numbers are too low to be meaningful
  if (intents < 10 && builders < 5) return null;

  return { intents, builders, ecosystems };
}
