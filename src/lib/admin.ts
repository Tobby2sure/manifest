/**
 * Admin access control. For now, a static allowlist via env var.
 * Format: comma-separated Dynamic user IDs (or email addresses) in
 * `MANIFEST_ADMIN_IDS`. Example:
 *   MANIFEST_ADMIN_IDS=user_abc123,user_xyz789
 *
 * Before launch, move to a `manifest_admins` table if the list grows.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUserId } from "@/lib/auth";

function getAdminList(): string[] {
  const raw = process.env.MANIFEST_ADMIN_IDS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Returns true if the given userId is a Manifest admin. */
export function isAdminUserId(userId: string): boolean {
  return getAdminList().includes(userId);
}

/** Checks the current session user against the admin allowlist.
 * Also accepts a match against the session user's email. */
export async function assertAdmin(): Promise<string> {
  const userId = await getSessionUserId();
  const admins = getAdminList();
  if (admins.includes(userId)) return userId;

  // Also check email if available
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  const email = (data as { email: string | null } | null)?.email;
  if (email && admins.includes(email)) return userId;

  throw new Error("Not authorized — admin access required");
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    await assertAdmin();
    return true;
  } catch {
    return false;
  }
}
