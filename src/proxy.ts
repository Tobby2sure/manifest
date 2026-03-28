import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_ROUTES = ["/", "/feed", "/profile", "/api", "/onboarding", "/invite"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static/internal routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (
    PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    )
  ) {
    return NextResponse.next();
  }

  // Verify NextAuth session token
  const token = await getToken({ req: request });

  if (!token) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Pass userId as header for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", token.sub ?? "");

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
