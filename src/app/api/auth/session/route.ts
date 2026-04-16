import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const SECRET = process.env.CRON_SECRET || "manifest-session-secret";

function sign(userId: string): string {
  return createHmac("sha256", SECRET).update(userId).digest("hex");
}

/**
 * POST /api/auth/session — sets an httpOnly cookie with a signed userId.
 * Called by the client after Dynamic auth succeeds.
 */
export async function POST(request: NextRequest) {
  const { userId } = await request.json();

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
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
 * Called on logout.
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("manifest_session");
  return response;
}
