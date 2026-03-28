import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple passthrough middleware — auth is handled client-side by Privy
export async function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
