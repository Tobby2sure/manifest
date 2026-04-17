import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL environment variable is required");
  return url;
}

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  const redirectUri = `${appUrl}/api/auth/twitter/callback`;

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=missing_params`);
  }

  const storedState = request.cookies.get("twitter_state")?.value;
  const codeVerifier = request.cookies.get("twitter_code_verifier")?.value;

  if (!storedState || storedState !== state || !codeVerifier) {
    return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=invalid_state`);
  }

  // Verify HMAC signature on state
  const [userId, nonce, signature] = state.split(":");
  const secret = process.env.CRON_SECRET || "dev-secret";
  const expected = createHmac("sha256", secret).update(`${userId}:${nonce}`).digest("hex");
  if (signature !== expected) {
    return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=invalid_state`);
  }

  if (!userId) {
    return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=no_user`);
  }

  try {
    const tokenBody = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      client_id: clientId,
    });

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: tokenBody,
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[twitter-callback] token exchange failed");
      return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=token_failed`);
    }

    const { access_token } = tokenData;

    // Use Twitter v2 /users/me to get the authenticated user's handle + avatar
    let twitterHandle: string | null = null;
    let twitterId: string | null = null;
    let twitterAvatar: string | null = null;

    try {
      const meRes = await fetch(
        "https://api.twitter.com/2/users/me?user.fields=profile_image_url",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );
      if (meRes.ok) {
        const meData = await meRes.json();
        twitterHandle = meData.data?.username ?? null;
        twitterId = meData.data?.id ?? null;
        // Twitter returns _normal (48x48); upgrade to _400x400 for profile pic
        const rawAvatar = meData.data?.profile_image_url ?? null;
        twitterAvatar = rawAvatar
          ? rawAvatar.replace("_normal", "_400x400")
          : null;
      }
    } catch {
      // v2 /users/me failed — continue without handle
    }

    // Fallback: decode JWT payload from access token (trusted — from server-to-server exchange via PKCE)
    if (!twitterHandle) {
      try {
        const parts = access_token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
          );
          twitterId = payload.sub ?? twitterId;
          twitterHandle = payload.username ?? payload.screen_name ?? null;
        }
      } catch {
        // Not a JWT — that's fine
      }
    }

    if (!twitterHandle && twitterId) {
      twitterHandle = `id_${twitterId}`;
    }

    // Save to Supabase
    const supabase = createAdminClient();

    // Check if this twitter_id is already linked to another profile
    if (twitterId) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("twitter_id", twitterId)
        .neq("id", userId)
        .maybeSingle();

      if (existing) {
        const response = NextResponse.redirect(
          `${appUrl}/onboarding/verify-x?error=twitter_already_linked`
        );
        response.cookies.delete("twitter_code_verifier");
        response.cookies.delete("twitter_state");
        return response;
      }
    }

    // Only auto-populate avatar_url if the user hasn't set one already.
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .maybeSingle();

    const shouldSetAvatar =
      twitterAvatar && !(currentProfile as { avatar_url: string | null } | null)?.avatar_url;

    const profileUpdate: Record<string, unknown> = {
      twitter_handle: twitterHandle,
      twitter_id: twitterId,
      twitter_verified: true,
      twitter_verified_at: new Date().toISOString(),
    };
    if (shouldSetAvatar) {
      profileUpdate.avatar_url = twitterAvatar;
    }

    const { error: dbError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", userId);

    if (dbError) {
      console.error("[twitter-callback] profile update failed");
      return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=db_failed`);
    }

    const response = NextResponse.redirect(`${appUrl}/onboarding/verify-x?success=true`);
    response.cookies.delete("twitter_code_verifier");
    response.cookies.delete("twitter_state");
    return response;

  } catch {
    console.error("[twitter-callback] unexpected error in callback");
    return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=unknown`);
  }
}
