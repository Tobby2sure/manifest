import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`;

// Decode JWT payload without verification (we trust Twitter signed it)
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://manifest-bondmans-projects.vercel.app";

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

  const userId = state.split(":")[0];
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=no_user`);
  }

  try {
    const tokenBody = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
      client_id: CLIENT_ID,
    });

    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: tokenBody,
    });

    const tokenData = await tokenRes.json();
    console.log("[twitter-callback] token response keys:", Object.keys(tokenData));

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=token_failed`);
    }

    const { access_token } = tokenData;

    // Try to extract username from JWT payload first (free, no API call)
    let twitterHandle: string | null = null;
    let twitterId: string | null = null;

    const jwtPayload = decodeJwtPayload(access_token);
    console.log("[twitter-callback] JWT payload:", JSON.stringify(jwtPayload));

    if (jwtPayload) {
      // Twitter JWT may contain sub (user ID) and username
      twitterId = jwtPayload.sub as string ?? null;
      twitterHandle = (jwtPayload.username ?? jwtPayload.screen_name ?? jwtPayload.name) as string ?? null;
    }

    // If JWT didn't have username, use Twitter ID as identifier
    if (!twitterHandle && twitterId) {
      twitterHandle = `id_${twitterId}`;
    }

    // Fallback: try the v1.1 account/verify_credentials endpoint (free tier)
    if (!twitterHandle || twitterHandle.startsWith("id_")) {
      try {
        const v1Res = await fetch("https://api.twitter.com/1.1/account/verify_credentials.json?include_email=false", {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        if (v1Res.ok) {
          const v1Data = await v1Res.json();
          console.log("[twitter-callback] v1 user:", JSON.stringify(v1Data).slice(0, 200));
          if (v1Data.screen_name) twitterHandle = v1Data.screen_name;
        }
      } catch (e) {
        console.log("[twitter-callback] v1 fallback failed:", e);
      }
    }

    console.log("[twitter-callback] final handle:", twitterHandle, "id:", twitterId);

    // Save to Supabase — even if we only have the Twitter ID, mark as verified
    const supabase = createAdminClient();
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        twitter_handle: twitterHandle,
        twitter_verified: true,
      })
      .eq("id", userId);

    if (dbError) {
      console.error("Supabase update failed:", dbError);
      return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=db_failed`);
    }

    const response = NextResponse.redirect(`${appUrl}/onboarding/verify-x?success=true`);
    response.cookies.delete("twitter_code_verifier");
    response.cookies.delete("twitter_state");
    return response;

  } catch (e) {
    console.error("Twitter callback error:", e);
    return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=unknown`);
  }
}
