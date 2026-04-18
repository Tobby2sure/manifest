"use server";

import { cookies } from "next/headers";
import { createHmac } from "crypto";

// Session cookies are HMAC-signed with a secret dedicated to session
// verification. Previously this fell back to a public constant when
// CRON_SECRET was unset — that made every signature forgeable. Now we
// read SESSION_SECRET lazily inside the verifier so Next's build-time
// module evaluation doesn't crash on a not-yet-configured preview, but
// any actual session check fails loudly if the env is missing.
function getSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error(
      "SESSION_SECRET is required. Generate one with `openssl rand -hex 32` and set it in the environment."
    );
  }
  return s;
}

/**
 * Verify our signed manifest_session cookie.
 */
function verifySessionCookie(value: string): string | null {
  const lastColon = value.lastIndexOf(":");
  if (lastColon === -1) return null;

  const userId = value.slice(0, lastColon);
  const signature = value.slice(lastColon + 1);
  const expected = createHmac("sha256", getSessionSecret()).update(userId).digest("hex");

  if (signature !== expected) return null;
  return userId;
}

/**
 * Get the authenticated user's ID from the manifest_session cookie.
 * This cookie is set by POST /api/auth/session, which in turn verifies
 * a Dynamic JWT before issuing it.
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
