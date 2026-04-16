import { PostHog } from "posthog-node";

let client: PostHog | null = null;

function getPostHogServer(): PostHog | null {
  if (client) return client;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });

  return client;
}

/**
 * Track a server-side event. No-op if PostHog is not configured.
 */
export function trackServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  getPostHogServer()?.capture({
    distinctId,
    event,
    properties,
  });
}
