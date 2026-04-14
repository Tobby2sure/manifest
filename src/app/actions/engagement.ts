"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/app/actions/notifications";
import type { Intent } from "@/lib/types/database";

/**
 * Send engagement summary notifications for intents posted ~24 hours ago.
 * Meant to be called by a cron job or Supabase edge function once per hour.
 *
 * For each intent posted 23-25 hours ago that hasn't received a summary yet:
 * - Gather view count, interest count, save count
 * - Send an "intent_engagement_summary" notification to the author
 */
export async function sendEngagementSummaries(): Promise<number> {
  const supabase = createAdminClient();

  const now = new Date();
  const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() - 23 * 60 * 60 * 1000);

  // Find intents posted 23-25 hours ago
  const { data: intents, error } = await supabase
    .from("intents")
    .select("id, author_id, content, type")
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString())
    .eq("lifecycle_status", "active");

  if (error || !intents || intents.length === 0) return 0;

  let sent = 0;

  for (const intent of intents as Array<Pick<Intent, "id" | "author_id" | "content" | "type">>) {
    // Check if we already sent a summary for this intent
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", intent.author_id)
      .eq("type", "intent_engagement_summary")
      .contains("payload", { intentId: intent.id })
      .maybeSingle();

    if (existing) continue;

    // Gather engagement stats
    const [viewRes, interestRes, saveRes] = await Promise.all([
      supabase
        .from("intent_views")
        .select("*", { count: "exact", head: true })
        .eq("intent_id", intent.id),
      supabase
        .from("intent_interests")
        .select("*", { count: "exact", head: true })
        .eq("intent_id", intent.id),
      supabase
        .from("saved_intents")
        .select("*", { count: "exact", head: true })
        .eq("intent_id", intent.id),
    ]);

    const views = viewRes.count ?? 0;
    const interests = interestRes.count ?? 0;
    const saves = saveRes.count ?? 0;

    // Only send if there's any engagement to report
    if (views === 0 && interests === 0 && saves === 0) continue;

    await createNotification(intent.author_id, "intent_engagement_summary", {
      intentId: intent.id,
      intentPreview: intent.content.slice(0, 80),
      views,
      interests,
      saves,
    });

    sent++;
  }

  return sent;
}

/**
 * Send suggestion notifications for intents that have been posted 48+ hours
 * with no connection requests.
 * Suggests other intents the author might want to connect with.
 */
export async function sendIntentSuggestions(): Promise<number> {
  const supabase = createAdminClient();

  const now = new Date();
  const windowStart = new Date(now.getTime() - 49 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() - 47 * 60 * 60 * 1000);

  // Find intents posted ~48 hours ago with no connection requests
  const { data: intents, error } = await supabase
    .from("intents")
    .select("id, author_id, ecosystem, sector, type")
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", windowEnd.toISOString())
    .eq("lifecycle_status", "active");

  if (error || !intents || intents.length === 0) return 0;

  let sent = 0;

  for (const intent of intents as Array<Pick<Intent, "id" | "author_id" | "ecosystem" | "sector" | "type">>) {
    // Check if this intent has any connection requests
    const { count: connCount } = await supabase
      .from("connection_requests")
      .select("*", { count: "exact", head: true })
      .eq("intent_id", intent.id);

    if ((connCount ?? 0) > 0) continue;

    // Check if we already sent suggestions for this intent
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", intent.author_id)
      .eq("type", "intent_suggestions")
      .contains("payload", { intentId: intent.id })
      .maybeSingle();

    if (existing) continue;

    // Find related intents (same ecosystem or sector, not by the same author)
    let relatedQuery = supabase
      .from("intents")
      .select("id, type, content, author_id")
      .neq("author_id", intent.author_id)
      .eq("lifecycle_status", "active")
      .gte("expires_at", now.toISOString())
      .limit(5)
      .order("created_at", { ascending: false });

    if (intent.ecosystem) {
      relatedQuery = relatedQuery.eq("ecosystem", intent.ecosystem);
    } else if (intent.sector) {
      relatedQuery = relatedQuery.eq("sector", intent.sector);
    }

    const { data: related } = await relatedQuery;

    if (!related || related.length === 0) continue;

    const suggestions = (related as Array<{ id: string; type: string; content: string }>).map((r) => ({
      intentId: r.id,
      type: r.type,
      preview: r.content.slice(0, 60),
    }));

    await createNotification(intent.author_id, "intent_suggestions", {
      intentId: intent.id,
      message: "While you wait for connections, check out these related intents",
      suggestions,
    });

    sent++;
  }

  return sent;
}
