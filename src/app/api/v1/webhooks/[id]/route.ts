import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

async function getAuthUserId(req: NextRequest): Promise<string | null> {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    return validateApiKey(apiKey);
  }

  const cookie = req.cookies.get("dynamic_auth")?.value;
  if (cookie) {
    try {
      const parts = cookie.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString()
        );
        return payload.sub ?? payload.userId ?? null;
      }
    } catch {
      // Invalid cookie
    }
  }

  return null;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("webhook_subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
