"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import type { Intent } from "@/lib/types/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://manifest.build";

/** Returns ISO week string like "2026-W16" for deduplication. */
function getIsoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Compile and send weekly digest emails to all users with email addresses.
 * Includes the 7 most interesting open intents from the past week.
 * Returns the number of emails sent.
 */
export async function sendWeeklyDigest(): Promise<number> {
  const supabase = createAdminClient();

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Get this week's most interesting intents (by interest + save count)
  const { data: recentIntents } = await supabase
    .from("intents")
    .select("*")
    .eq("lifecycle_status", "active")
    .gte("expires_at", new Date().toISOString())
    .gte("created_at", oneWeekAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  if (!recentIntents || recentIntents.length === 0) {
    console.log("[Digest] No new intents this week — skipping digest.");
    return 0;
  }

  // Get engagement counts for ranking
  const intentIds = recentIntents.map((i: Intent) => i.id);
  const [interestData, saveData] = await Promise.all([
    supabase.from("intent_interests").select("intent_id").in("intent_id", intentIds),
    supabase.from("saved_intents").select("intent_id").in("intent_id", intentIds),
  ]);

  const interestCounts: Record<string, number> = {};
  const saveCounts: Record<string, number> = {};
  for (const row of (interestData.data ?? []) as Array<{ intent_id: string }>) {
    interestCounts[row.intent_id] = (interestCounts[row.intent_id] ?? 0) + 1;
  }
  for (const row of (saveData.data ?? []) as Array<{ intent_id: string }>) {
    saveCounts[row.intent_id] = (saveCounts[row.intent_id] ?? 0) + 1;
  }

  // Sort by engagement and take top 7
  const ranked = recentIntents
    .map((i: Intent) => ({
      ...i,
      score: (interestCounts[i.id] ?? 0) + (saveCounts[i.id] ?? 0),
    }))
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, 7);

  // Get week stats
  const { count: newIntentCount } = await supabase
    .from("intents")
    .select("*", { count: "exact", head: true })
    .gte("created_at", oneWeekAgo.toISOString());

  const { count: newConnectionCount } = await supabase
    .from("connection_requests")
    .select("*", { count: "exact", head: true })
    .gte("created_at", oneWeekAgo.toISOString());

  const html = buildDigestHtml(ranked, newIntentCount ?? 0, newConnectionCount ?? 0);

  // Get all users with email addresses
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .not("email", "is", null);

  if (!profiles || profiles.length === 0) return 0;

  const digestWeek = getIsoWeek(new Date());
  let sent = 0;

  for (const profile of profiles as Array<{ id: string; email: string; display_name: string | null }>) {
    if (!profile.email) continue;

    // Idempotency: skip if already sent this week
    const { data: alreadySent } = await supabase
      .from("digest_sends")
      .select("id")
      .eq("user_id", profile.id)
      .eq("digest_week", digestWeek)
      .maybeSingle();

    if (alreadySent) continue;

    const subject = `This week on Manifest: ${newIntentCount} new intents`;

    const success = await sendEmail({
      to: profile.email,
      subject,
      html,
    });

    if (success) {
      await supabase
        .from("digest_sends")
        .insert({ user_id: profile.id, digest_week: digestWeek })
        .select()
        .maybeSingle();
      sent++;
    }
  }

  return sent;
}

function buildDigestHtml(
  intents: Array<Intent & { score: number }>,
  newIntentCount: number,
  newConnectionCount: number
): string {
  const intentRows = intents
    .map((intent) => {
      const typeLabel = intent.type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const preview = intent.content.length > 120 ? intent.content.slice(0, 120) + "..." : intent.content;
      return `
        <tr>
          <td style="padding: 16px 0; border-bottom: 1px solid #1e1e2e;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: #1a1a2e; color: #8b5cf6; font-size: 12px; font-weight: 600; margin-bottom: 8px;">${typeLabel}</span>
            <p style="margin: 8px 0 4px; color: #e2e8f0; font-size: 14px; line-height: 1.5;">${preview}</p>
            <a href="${APP_URL}/feed?intent=${intent.id}" style="color: #10b981; text-decoration: none; font-size: 13px;">View intent &rarr;</a>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background: #080810; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #f1f5f9; font-size: 24px; margin-bottom: 8px;">This week on Manifest</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">
          ${newIntentCount} new intents posted &middot; ${newConnectionCount} connections made
        </p>

        <div style="background: #0f0f1a; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h2 style="color: #f1f5f9; font-size: 16px; margin: 0 0 16px;">Top intents this week</h2>
          <table style="width: 100%; border-collapse: collapse;">
            ${intentRows}
          </table>
        </div>

        <div style="text-align: center; margin-top: 32px;">
          <a href="${APP_URL}/feed" style="display: inline-block; padding: 12px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Browse All Intents</a>
        </div>

        <p style="color: #475569; font-size: 11px; text-align: center; margin-top: 32px;">
          You're receiving this because you have an account on Manifest.<br>
          <a href="${APP_URL}/settings" style="color: #475569; text-decoration: underline;">Manage preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;
}
