import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`;

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

  // Verify state
  const storedState = request.cookies.get("twitter_state")?.value;
  const codeVerifier = request.cookies.get("twitter_code_verifier")?.value;

  if (!storedState || storedState !== state || !codeVerifier) {
    return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=invalid_state`);
  }

  // Extract userId from state
  const userId = state.split(":")[0];
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=no_user`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Token exchange failed:", err);
      return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=token_failed`);
    }

    const { access_token } = await tokenRes.json();

    // Fetch Twitter user info
    const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=username,name,profile_image_url", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=user_fetch_failed`);
    }

    const { data: twitterUser } = await userRes.json();
    const twitterHandle = twitterUser.username;

    // Save to Supabase
    const supabase = await createClient();
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

    // Clear cookies and redirect to success
    const response = NextResponse.redirect(`${appUrl}/onboarding/verify-x?success=true`);
    response.cookies.delete("twitter_code_verifier");
    response.cookies.delete("twitter_state");
    return response;

  } catch (e) {
    console.error("Twitter callback error:", e);
    return NextResponse.redirect(`${appUrl}/onboarding/verify-x?error=unknown`);
  }
}
