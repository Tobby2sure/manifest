import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey } from "@/lib/api-auth";
import { deliverIntentWebhooks } from "@/lib/webhooks";
import type {
  IntentType,
  Ecosystem,
  Sector,
  IntentPriority,
} from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const type = params.get("type") as IntentType | null;
  const ecosystem = params.get("ecosystem") as Ecosystem | null;
  const sector = params.get("sector") as Sector | null;
  const limit = Math.min(
    Math.max(parseInt(params.get("limit") ?? "20", 10) || 20, 1),
    100
  );
  const offset = Math.max(parseInt(params.get("offset") ?? "0", 10) || 0, 0);

  const supabase = createAdminClient();

  let query = supabase
    .from("intents")
    .select("*, author:profiles!author_id(*)", { count: "exact" })
    .eq("lifecycle_status", "active")
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq("type", type);
  if (ecosystem) query = query.eq("ecosystem", ecosystem);
  if (sector) query = query.eq("sector", sector);

  const { data, error, count } = await query;

  if (error) {
    console.error("[intents-api] list error:", error.message);
    return NextResponse.json({ error: "Failed to fetch intents" }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  const userId = await validateApiKey(apiKey);

  if (!userId) {
    return NextResponse.json(
      { error: "Invalid or missing API key" },
      { status: 401 }
    );
  }

  let body: {
    type?: IntentType;
    content?: string;
    ecosystem?: Ecosystem | null;
    sector?: Sector | null;
    priority?: IntentPriority;
    duration_days?: number;
    org_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.type || !body.content) {
    return NextResponse.json(
      { error: "type and content are required" },
      { status: 400 }
    );
  }

  if (body.content.length < 50 || body.content.length > 500) {
    return NextResponse.json(
      { error: "content must be 50-500 characters" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Verify org membership if org_id is provided
  if (body.org_id) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("id")
      .eq("org_id", body.org_id)
      .eq("profile_id", userId)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      );
    }
  }

  const durationDays = body.duration_days ?? 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const { data, error } = await supabase
    .from("intents")
    .insert({
      author_id: userId,
      org_id: body.org_id ?? null,
      type: body.type,
      content: body.content,
      ecosystem: body.ecosystem ?? null,
      sector: body.sector ?? null,
      priority: body.priority ?? "Open",
      expires_at: expiresAt.toISOString(),
      lifecycle_status: "active",
    })
    .select()
    .single();

  if (error) {
    console.error("[intents-api] create error:", error.message);
    return NextResponse.json({ error: "Failed to create intent" }, { status: 500 });
  }

  // Fire webhooks (fire-and-forget)
  deliverIntentWebhooks(data);

  return NextResponse.json({ data }, { status: 201 });
}
