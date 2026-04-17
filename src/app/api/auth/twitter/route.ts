import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

function getConfig() {
  return {
    clientId: process.env.TWITTER_CLIENT_ID!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`,
  };
}

// Generate PKCE code verifier and challenge
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function GET(request: NextRequest) {
  // Fail-loud checks for misconfigured env
  if (!process.env.TWITTER_CLIENT_ID) {
    console.error("[twitter-auth] TWITTER_CLIENT_ID not set");
    return NextResponse.redirect(
      new URL("/onboarding/verify-x?error=not_configured", request.url)
    );
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.error("[twitter-auth] NEXT_PUBLIC_APP_URL not set");
    return NextResponse.redirect(
      new URL("/onboarding/verify-x?error=not_configured", request.url)
    );
  }

  // Read userId from our signed manifest_session cookie
  let userId: string | null = null;
  const sessionCookie = request.cookies.get("manifest_session")?.value;
  if (sessionCookie) {
    const lastColon = sessionCookie.lastIndexOf(":");
    if (lastColon !== -1) {
      const id = sessionCookie.slice(0, lastColon);
      const sig = sessionCookie.slice(lastColon + 1);
      const secret = process.env.CRON_SECRET || "manifest-session-secret";
      const expected = createHmac("sha256", secret).update(id).digest("hex");
      if (sig === expected) userId = id;
    }
  }

  if (!userId) {
    return NextResponse.redirect(new URL("/onboarding/verify-x?error=not_authenticated", request.url));
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const nonce = crypto.randomUUID();
  const secret = process.env.CRON_SECRET || "dev-secret";
  const signature = createHmac("sha256", secret).update(`${userId}:${nonce}`).digest("hex");
  const state = `${userId}:${nonce}:${signature}`;

  const { clientId, redirectUri } = getConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "tweet.read users.read",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  // Twitter has migrated to x.com; use the stable canonical URL.
  const response = NextResponse.redirect(
    `https://x.com/i/oauth2/authorize?${params.toString()}`
  );

  // Store verifier and state in cookies
  response.cookies.set("twitter_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });
  response.cookies.set("twitter_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
