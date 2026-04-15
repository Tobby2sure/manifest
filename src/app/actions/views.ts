"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function recordView(
  intentId: string,
  viewerId: string | null
): Promise<void> {
  const supabase = createAdminClient();

  // Deduplicate: one view per viewer per intent
  if (viewerId) {
    const { data: existing } = await supabase
      .from("intent_views")
      .select("id")
      .eq("intent_id", intentId)
      .eq("viewer_id", viewerId)
      .maybeSingle();

    if (existing) return;
  }

  await supabase.from("intent_views").insert({
    intent_id: intentId,
    viewer_id: viewerId,
  });
}

export async function getViewCount(intentId: string): Promise<number> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("intent_views")
    .select("*", { count: "exact", head: true })
    .eq("intent_id", intentId);

  if (error) return 0;
  return count ?? 0;
}

export async function getViewCounts(
  intentIds: string[]
): Promise<Record<string, number>> {
  if (intentIds.length === 0) return {};

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("intent_views")
    .select("intent_id")
    .in("intent_id", intentIds);

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data as Array<{ intent_id: string }>) {
    counts[row.intent_id] = (counts[row.intent_id] ?? 0) + 1;
  }
  return counts;
}

export async function getIntentEngagementStats(intentId: string): Promise<{
  views: number;
  interests: number;
  saves: number;
  connectionRequests: number;
}> {
  const supabase = createAdminClient();

  const [viewRes, interestRes, saveRes, connRes] = await Promise.all([
    supabase
      .from("intent_views")
      .select("*", { count: "exact", head: true })
      .eq("intent_id", intentId),
    supabase
      .from("intent_interests")
      .select("*", { count: "exact", head: true })
      .eq("intent_id", intentId),
    supabase
      .from("saved_intents")
      .select("*", { count: "exact", head: true })
      .eq("intent_id", intentId),
    supabase
      .from("connection_requests")
      .select("*", { count: "exact", head: true })
      .eq("intent_id", intentId),
  ]);

  return {
    views: viewRes.count ?? 0,
    interests: interestRes.count ?? 0,
    saves: saveRes.count ?? 0,
    connectionRequests: connRes.count ?? 0,
  };
}

export async function getVerifiedUserCount(): Promise<number> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("twitter_verified", true);

  if (error) return 0;
  return count ?? 0;
}
