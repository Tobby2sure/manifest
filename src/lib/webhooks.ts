import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";
import type { Intent } from "@/lib/types/database";

interface WebhookSubscription {
  id: string;
  url: string;
  secret: string;
  events: string[];
  filters: { type?: string; ecosystem?: string } | null;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Fire webhooks for a newly created intent.
 * Runs fire-and-forget — errors are logged but never thrown.
 */
export function deliverIntentWebhooks(intent: Intent) {
  // Run async but don't await
  _deliver(intent).catch((err) =>
    console.error("[webhooks] delivery error:", err)
  );
}

async function _deliver(intent: Intent) {
  const supabase = createAdminClient();

  const { data: subs } = await supabase
    .from("webhook_subscriptions")
    .select("id, url, secret, events, filters")
    .eq("active", true)
    .contains("events", ["intent.created"]);

  if (!subs || subs.length === 0) return;

  const matched = (subs as WebhookSubscription[]).filter((sub) => {
    if (!sub.filters) return true;
    if (sub.filters.type && sub.filters.type !== intent.type) return false;
    if (sub.filters.ecosystem && sub.filters.ecosystem !== intent.ecosystem)
      return false;
    return true;
  });

  const payload = JSON.stringify({
    event: "intent.created",
    data: intent,
    timestamp: new Date().toISOString(),
  });

  await Promise.allSettled(
    matched.map(async (sub) => {
      try {
        const signature = signPayload(payload, sub.secret);
        await fetch(sub.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-manifest-signature": signature,
          },
          body: payload,
          signal: AbortSignal.timeout(10000),
        });
      } catch (err) {
        console.error(`[webhooks] failed to deliver to ${sub.url}:`, err);
      }
    })
  );
}
