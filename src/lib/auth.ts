"use server";

import { cookies } from "next/headers";

/**
 * Get the authenticated user's ID from the Dynamic Labs session cookie.
 * For use in server actions where NextRequest is not available.
 * Throws if no valid session exists.
 */
export async function getSessionUserId(): Promise<string> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("dynamic_auth")?.value;

  if (!cookie) {
    throw new Error("Not authenticated");
  }

  try {
    const parts = cookie.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString()
      );
      const userId = payload.sub ?? payload.userId;
      if (userId) return userId;
    }
  } catch {
    // Invalid JWT
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
