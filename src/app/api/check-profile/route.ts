import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ exists: false });
  }

  // Rate-limit defense: require a referer from our own app
  const referer = request.headers.get("referer") ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (appUrl && referer && !referer.startsWith(appUrl)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  return NextResponse.json({ exists: !!data });
}
