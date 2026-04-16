import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let connectionLimit: Ratelimit | null = null;

function getRateLimiter(): Ratelimit | null {
  if (connectionLimit) return connectionLimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  connectionLimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "1 d"),
    prefix: "ratelimit:connections",
  });

  return connectionLimit;
}

/**
 * Check if a user has exceeded the connection request rate limit.
 * Returns null if rate limiting is not configured (dev mode).
 * Throws an error if the limit is exceeded.
 */
export async function checkConnectionRateLimit(senderId: string): Promise<void> {
  const limiter = getRateLimiter();
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
    }
    return;
  }

  const { success, remaining, reset } = await limiter.limit(senderId);

  if (!success) {
    const resetMinutes = Math.ceil((reset - Date.now()) / 60000);
    throw new Error(
      `You've reached the daily limit of 10 connection requests. Try again in ${resetMinutes} minutes.`
    );
  }
}
