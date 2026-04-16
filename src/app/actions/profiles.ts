"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { mintOnboardingNFT } from "@/lib/mint";
import type { Profile, AccountType } from "@/lib/types/database";

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createAdminClient();

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
  // Input validation
  if (!input.display_name || input.display_name.trim().length < 1 || input.display_name.length > 100) {
    throw new Error("Display name must be 1-100 characters");
  }
  if (input.bio && input.bio.length > 500) {
    throw new Error("Bio must be 500 characters or fewer");
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new Error("Invalid email format");
  }
  if (input.telegram_handle && !/^[a-zA-Z0-9_]{1,32}$/.test(input.telegram_handle)) {
    throw new Error("Invalid Telegram handle");
  }

  const supabase = createAdminClient();

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

  const profile = data as Profile;

  // Mint onboarding NFT in the background if wallet is present
  if (profile.wallet_address) {
    mintOnboardingNFT(profile.wallet_address)
      .then(async (txHash) => {
        if (txHash) {
          await supabase
            .from("profiles")
            .update({ onboarding_nft_tx: txHash })
            .eq("id", profile.id);
        }
      })
      .catch((err) => console.error("[onboarding-nft] mint failed:", err));
  }

  return profile;
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
  const supabase = createAdminClient();

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
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("twitter_verified")
    .eq("id", userId)
    .single();

  if (error || !data) return false;
  return (data as { twitter_verified: boolean }).twitter_verified;
}

export async function calculateResponseRate(userId: string): Promise<number> {
  const supabase = createAdminClient();

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
