"use server";

import { cookies } from "next/headers";

/**
 * Try to extract a userId from a JWT cookie value.
 */
function extractUserIdFromJwt(value: string): string | null {
  try {
    const parts = value.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString()
    );
    return payload.sub ?? payload.userId ?? null;
  } catch {
    return null;
  }
}

/**
 * Known Dynamic Labs cookie names — varies by SDK version.
 * We also scan all cookies for JWTs as a fallback.
 */
const DYNAMIC_COOKIE_NAMES = [
  "dynamic_auth",
  "dynamic_authenticated_user",
  "dynamic_auth_token",
];

/**
 * Get the authenticated user's ID from the Dynamic Labs session cookie.
 * For use in server actions where NextRequest is not available.
 * Throws if no valid session exists.
 */
export async function getSessionUserId(): Promise<string> {
  const cookieStore = await cookies();

  // Try known cookie names first
  for (const name of DYNAMIC_COOKIE_NAMES) {
    const value = cookieStore.get(name)?.value;
    if (value) {
      const userId = extractUserIdFromJwt(value);
      if (userId) return userId;
    }
  }

  // Fallback: scan all cookies for a JWT containing a userId
  for (const cookie of cookieStore.getAll()) {
    if (cookie.value.includes(".") && cookie.value.length > 50) {
      const userId = extractUserIdFromJwt(cookie.value);
      if (userId) return userId;
    }
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
