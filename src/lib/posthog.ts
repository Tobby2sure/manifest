import { PostHog } from "posthog-node";

let client: PostHog | null = null;

function getPostHogServer(): PostHog | null {
  if (client) return client;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  try {
    client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  } catch (e) {
    console.error("[posthog] Failed to initialize:", e);
    return null;
  }

  return client;
}

/**
 * Track a server-side event. Never throws — no-op if PostHog is not configured or fails.
 */
export function trackServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  try {
    getPostHogServer()?.capture({
      distinctId,
      event,
      properties,
    });
  } catch {
    // Analytics must never break the app
  }
}
