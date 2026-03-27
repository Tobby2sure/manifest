import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/feed", "/api"];
const PROFILE_PREFIX = "/profile/";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (
    PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/")) ||
    pathname.startsWith(PROFILE_PREFIX) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // For protected routes, we rely on client-side auth checks via Privy
  // since Privy auth state is managed client-side.
  // Middleware here primarily ensures routing consistency.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
