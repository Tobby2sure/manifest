import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOptionalSessionUserId } from "@/lib/auth";

/**
 * GET /api/check-profile
 *
 * Returns whether the currently-signed-in user has a profile row.
 * Used by the client on auth success to decide whether to route to
 * /onboarding (no profile) or /feed (profile exists).
 *
 * Previous implementation accepted an arbitrary userId in the query
 * string and returned existence to any anonymous caller — open user
 * enumeration. Now scoped strictly to the session user.
 */
export async function GET() {
  const userId = await getOptionalSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  return NextResponse.json({ exists: !!data });
}
