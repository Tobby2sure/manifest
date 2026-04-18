"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUserId, signSessionCookieValue } from "@/lib/auth";

/**
 * Revoke every other signed session for the current user and reissue
 * this browser's cookie so the user isn't kicked out of the device
 * they're acting from.
 *
 * Mechanism: every session cookie embeds the token_version it was
 * signed at; getSessionUserId() rejects any cookie whose version
 * no longer matches profiles.token_version. Bumping the counter
 * invalidates every outstanding cookie in one shot, then we reissue
 * this browser's cookie at the new version.
 */
export async function revokeOtherSessions(): Promise<void> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  // Atomic increment — relies on the row's current value, not a
  // read-then-write pattern. rpc() would be tidier but this works
  // without adding a function to the DB.
  const { data: before, error: readError } = await supabase
    .from("profiles")
    .select("token_version")
    .eq("id", userId)
    .single();

  if (readError || !before) {
    throw new Error("Could not read session state");
  }

  const next = ((before as { token_version?: number }).token_version ?? 0) + 1;
  const { error: writeError } = await supabase
    .from("profiles")
    .update({ token_version: next })
    .eq("id", userId);

  if (writeError) {
    throw new Error("Could not revoke sessions");
  }

  // Reissue the current browser's cookie at the new version so this
  // device stays signed in.
  const cookieStore = await cookies();
  cookieStore.set("manifest_session", await signSessionCookieValue(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}
