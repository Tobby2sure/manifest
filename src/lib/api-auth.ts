import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";
import { type NextRequest } from "next/server";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(
  apiKey: string | null
): Promise<string | null> {
  if (!apiKey) return null;

  const supabase = createAdminClient();
  const keyHash = hashApiKey(apiKey);

  const { data, error } = await supabase
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", keyHash)
    .single();

  if (error || !data) return null;

  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash)
    .then(() => {});

  return data.user_id;
}

export async function getAuthUserId(req: NextRequest): Promise<string | null> {
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
