import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";

const PUBLIC_ROUTES = ["/", "/feed", "/profile", "/api", "/onboarding", "/invite"];

const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

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

  // Attempt to verify Privy auth token
  const authToken =
    request.cookies.get("privy-token")?.value ??
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!authToken) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  try {
    const { userId } = await privyClient.verifyAuthToken(authToken);

    // Pass userId as header for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-privy-user-id", userId);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    // Invalid token — redirect to onboarding
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
