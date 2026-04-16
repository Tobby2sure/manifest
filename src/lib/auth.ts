"use server";

import { cookies } from "next/headers";
import { createHmac } from "crypto";

const SECRET = process.env.CRON_SECRET || "manifest-session-secret";

/**
 * Verify our signed manifest_session cookie.
 */
function verifySessionCookie(value: string): string | null {
  const lastColon = value.lastIndexOf(":");
  if (lastColon === -1) return null;

  const userId = value.slice(0, lastColon);
  const signature = value.slice(lastColon + 1);
  const expected = createHmac("sha256", SECRET).update(userId).digest("hex");

  if (signature !== expected) return null;
  return userId;
}

/**
 * Get the authenticated user's ID from the manifest_session cookie.
 * This cookie is set by POST /api/auth/session after Dynamic auth.
 * Throws if no valid session exists.
 */
export async function getSessionUserId(): Promise<string> {
  const cookieStore = await cookies();
  const session = cookieStore.get("manifest_session")?.value;

  if (session) {
    const userId = verifySessionCookie(session);
    if (userId) return userId;
  }

  throw new Error("Not authenticated");
}

/**
 * Get the authenticated user's ID, or null if not logged in.
 * For optional-auth contexts (e.g., recording views).
 */
export async function getOptionalSessionUserId(): Promise<string | null> {
  try {
    return await getSessionUserId();
  } catch {
    return null;
  }
}
