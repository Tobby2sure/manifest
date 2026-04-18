import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { verifyDynamicJwt } from "@/lib/dynamic-jwt";

// Lazy lookup: don't crash Next's build-time module evaluation if the
// env isn't set yet (e.g. on a fresh preview), but any actual request
// that tries to sign a cookie will throw loudly on a missing secret.
function getSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error(
      "SESSION_SECRET is required. Generate one with `openssl rand -hex 32` and set it in the environment."
    );
  }
  return s;
}

function sign(userId: string): string {
  return createHmac("sha256", getSessionSecret()).update(userId).digest("hex");
}

/**
 * POST /api/auth/session
 *
 * Caller must pass `Authorization: Bearer <dynamicJwt>`. We verify the JWT
 * against Dynamic's JWKS before minting our session cookie, and use the
 * *verified* `sub` claim — never a user-supplied userId — as the identity.
 *
 * This replaces the previous implementation, which accepted any userId
 * from the request body and minted a cookie for it (total impersonation).
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) {
    return NextResponse.json(
      { error: "Missing Authorization: Bearer <token>" },
      { status: 401 }
    );
  }

  const token = match[1].trim();
  let userId: string;
  try {
    const payload = await verifyDynamicJwt(token);
    userId = payload.sub;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "verification failed";
    return NextResponse.json({ error: `Invalid token: ${msg}` }, { status: 401 });
  }

  const signature = sign(userId);
  const response = NextResponse.json({ ok: true });

  response.cookies.set("manifest_session", `${userId}:${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}

/**
 * DELETE /api/auth/session — clears the session cookie.
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("manifest_session");
  return response;
}
