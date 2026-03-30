"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashApiKey } from "@/lib/api-auth";
import { randomBytes } from "crypto";

export async function getUserApiKey(
  userId: string
): Promise<{ id: string; name: string; created_at: string } | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("api_keys")
    .select("id, name, created_at, last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function generateApiKey(
  userId: string
): Promise<{ key: string; id: string }> {
  const supabase = createAdminClient();

  // Delete existing keys for this user
  await supabase.from("api_keys").delete().eq("user_id", userId);

  const rawKey = `mfst_${randomBytes(24).toString("hex")}`;
  const keyHash = hashApiKey(rawKey);

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: userId,
      key_hash: keyHash,
      name: "Default API Key",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  return { key: rawKey, id: data.id };
}

export async function getUserWebhooks(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("webhook_subscriptions")
    .select("id, url, events, filters, active, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createWebhook(
  userId: string,
  url: string,
  events: string[]
) {
  const supabase = createAdminClient();
  const secret = randomBytes(32).toString("hex");

  const { data, error } = await supabase
    .from("webhook_subscriptions")
    .insert({
      user_id: userId,
      url,
      events: events.length ? events : ["intent.created"],
      filters: {},
      secret,
      active: true,
    })
    .select("id, url, events, filters, active, created_at")
    .single();

  if (error) throw new Error(error.message);
  return { ...data, secret };
}

export async function deleteWebhook(userId: string, webhookId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("webhook_subscriptions")
    .delete()
    .eq("id", webhookId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
