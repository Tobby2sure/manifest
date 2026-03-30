import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Validate an API key from the x-api-key header.
 * Returns the user_id if valid, null otherwise.
 */
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

  // Update last_used_at (fire-and-forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash)
    .then(() => {});

  return data.user_id;
}
