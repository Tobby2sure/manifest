import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/api-auth";
import { assertPublicHttpsUrl } from "@/lib/url-safety";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("webhook_subscriptions")
    .select("id, url, events, filters, active, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[webhooks] list error:", error.message);
    return NextResponse.json({ error: "Failed to list webhooks" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    url?: string;
    events?: string[];
    filters?: { type?: string; ecosystem?: string };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    await assertPublicHttpsUrl(body.url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid URL";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const secret = randomBytes(32).toString("hex");
  const events = body.events?.length ? body.events : ["intent.created"];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("webhook_subscriptions")
    .insert({
      user_id: userId,
      url: body.url,
      events,
      filters: body.filters ?? {},
      secret,
      active: true,
    })
    .select("id, url, events, filters, active, created_at, secret")
    .single();

  if (error) {
    console.error("[webhooks] create error:", error.message);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }

  // Return secret only on creation
  return NextResponse.json({ data }, { status: 201 });
}
