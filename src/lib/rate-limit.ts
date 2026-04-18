import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

// Cache limiters per prefix so we don't rebuild the sliding-window state
// on every request.
const limiters = new Map<string, Ratelimit>();

function getLimiter(prefix: string, perDay: number): Ratelimit | null {
  const cached = limiters.get(prefix);
  if (cached) return cached;

  const r = getRedis();
  if (!r) return null;

  const limiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(perDay, "1 d"),
    prefix,
  });
  limiters.set(prefix, limiter);
  return limiter;
}

/**
 * Check a per-user rate limit by prefix. In production, refuses to run
 * without Upstash configured (fail closed). In dev, silently allows.
 * Throws on exceeded with a user-safe message.
 */
async function enforce(
  prefix: string,
  perDay: number,
  userId: string,
  label: string
): Promise<void> {
  const limiter = getLimiter(prefix, perDay);
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
      );
    }
    return;
  }

  const { success, reset } = await limiter.limit(userId);
  if (!success) {
    const resetMinutes = Math.ceil((reset - Date.now()) / 60000);
    throw new Error(
      `You've reached the daily limit of ${perDay} ${label}. Try again in ${resetMinutes} minutes.`
    );
  }
}

/** 10/day sliding window on outgoing connection requests. */
export async function checkConnectionRateLimit(senderId: string): Promise<void> {
  await enforce("ratelimit:connections", 10, senderId, "connection requests");
}

/**
 * 20/day sliding window on intent creation.
 *
 * Each created intent triggers an on-chain NFT mint (src/lib/nft.ts), so an
 * unlimited poster could force the deployer wallet to spend arbitrary gas.
 * The cap bounds the worst case while leaving plenty of room for real use.
 */
export async function checkIntentCreationRateLimit(authorId: string): Promise<void> {
  await enforce("ratelimit:intents", 20, authorId, "intent posts");
}
