"use server";

import { createClient } from "@/lib/supabase/server";
import type { Profile, AccountType } from "@/lib/types/database";

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return (data as Profile) ?? null;
}

export async function upsertProfile(input: {
  id: string;
  display_name: string;
  bio?: string;
  telegram_handle?: string;
  email?: string;
  account_type: AccountType;
  avatar_url?: string;
  twitter_handle?: string;
  twitter_verified?: boolean;
  wallet_address?: string;
}): Promise<Profile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: input.id,
        display_name: input.display_name,
        bio: input.bio ?? null,
        telegram_handle: input.telegram_handle ?? null,
        email: input.email ?? null,
        account_type: input.account_type,
        avatar_url: input.avatar_url ?? null,
        twitter_handle: input.twitter_handle ?? null,
        twitter_verified: input.twitter_verified ?? false,
        wallet_address: input.wallet_address ?? null,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: {
    display_name?: string;
    bio?: string;
    telegram_handle?: string;
    email?: string;
    avatar_url?: string;
    twitter_handle?: string;
    twitter_verified?: boolean;
  }
): Promise<Profile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}

export async function isTwitterVerified(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("twitter_verified")
    .eq("id", userId)
    .single();

  if (error || !data) return false;
  return (data as { twitter_verified: boolean }).twitter_verified;
}

export async function updateLastActive(userId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", userId);
}

export async function calculateResponseRate(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count: total } = await supabase
    .from("connection_requests")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", userId);

  if (!total || total === 0) return 0;

  const { count: accepted } = await supabase
    .from("connection_requests")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .eq("status", "accepted");

  const rate = Math.round(((accepted ?? 0) / total) * 100);

  // Update cached value
  await supabase
    .from("profiles")
    .update({ response_rate: rate })
    .eq("id", userId);

  return rate;
}
