"use server";

import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

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

type ParsedSession = { userId: string; version: number };

/**
 * Parse + HMAC-verify our signed manifest_session cookie. Returns the
 * userId and the token_version the cookie was issued at, or null if
 * the cookie is missing/malformed/forged.
 *
 * Does NOT verify the version against the DB — that's a separate
 * step so we only pay for the DB read on authenticated requests.
 */
function parseAndVerifyCookie(value: string): ParsedSession | null {
  const parts = value.split(":");
  if (parts.length !== 3) return null;
  const [userId, versionStr, signature] = parts;
  const version = Number(versionStr);
  if (!userId || !Number.isInteger(version)) return null;

  const expected = createHmac("sha256", getSessionSecret())
    .update(`${userId}:${version}`)
    .digest("hex");
  if (signature !== expected) return null;
  return { userId, version };
}

async function currentTokenVersion(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("token_version")
    .eq("id", userId)
    .maybeSingle();
  return (data as { token_version?: number } | null)?.token_version ?? 0;
}

/**
 * Get the authenticated user's ID from the manifest_session cookie.
 * Enforces that the cookie's token_version still matches the profile's
 * current value — bumping token_version in the DB invalidates all
 * outstanding cookies (used for sign-out-everywhere).
 *
 * Throws if no valid session exists.
 */
export async function getSessionUserId(): Promise<string> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("manifest_session")?.value;
  if (!raw) throw new Error("Not authenticated");

  const parsed = parseAndVerifyCookie(raw);
  if (!parsed) throw new Error("Not authenticated");

  const dbVersion = await currentTokenVersion(parsed.userId);
  if (dbVersion !== parsed.version) throw new Error("Not authenticated");

  return parsed.userId;
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

/**
 * Internal helper: mint a session-cookie value for the given user at
 * their current token_version. Used by the sign-out-everywhere flow
 * to reissue the caller's cookie after bumping the DB version.
 */
export async function signSessionCookieValue(userId: string): Promise<string> {
  const version = await currentTokenVersion(userId);
  const signature = createHmac("sha256", getSessionSecret())
    .update(`${userId}:${version}`)
    .digest("hex");
  return `${userId}:${version}:${signature}`;
}
