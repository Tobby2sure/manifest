"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { mintOnboardingNFT } from "@/lib/nft";
import { trackServerEvent } from "@/lib/posthog";
import { getSessionUserId } from "@/lib/auth";
import type { Profile, AccountType } from "@/lib/types/database";

async function assertDisplayNameAvailable(
  supabase: ReturnType<typeof createAdminClient>,
  displayName: string,
  selfId: string
): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("display_name", displayName)
    .neq("id", selfId)
    .maybeSingle();
  if (data) throw new Error("That display name is already taken");
}

// Translate Supabase/Postgres errors at the write boundary into
// user-safe copy. We never surface raw SQL messages to the UI —
// they leak constraint names, indexes, column details, etc.
// Known unique-constraint violations get a purpose-written message;
// everything else collapses to a generic retry prompt. The original
// error is logged for server-side debugging.
function humanizeProfileWriteError(error: {
  code?: string;
  message?: string;
}): Error {
  console.error("[profiles] write failed:", error);
  if (error.code === "23505" || /unique/i.test(error.message ?? "")) {
    const msg = error.message ?? "";
    if (msg.includes("idx_profiles_display_name_ci_unique")) {
      return new Error("That display name is already taken");
    }
    if (
      msg.includes("idx_profiles_twitter_handle_ci_unique") ||
      msg.includes("idx_profiles_twitter_id_unique")
    ) {
      return new Error("That X account is already linked to another profile");
    }
    return new Error("That value is already in use by another profile");
  }
  return new Error("We couldn't save your profile. Please try again.");
}

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

/**
 * Returns per-tab content counts for the profile page, used to hide empty tabs.
 * Owner-only counts (saved, connections) are gated via getSessionUserId.
 */
export async function getProfileCounts(userId: string): Promise<{
  endorsements: number;
  saved: number;
  connections: number;
  nfts: number;
}> {
  const supabase = createAdminClient();

  // Session check — saved/connections are owner-only views
  let sessionUserId: string | null = null;
  try {
    sessionUserId = await getSessionUserId();
  } catch {
    // Anonymous visitor is fine; owner-only counts will resolve to 0
  }
  const isOwner = sessionUserId === userId;

  const endorsementsPromise = supabase
    .from("endorsements")
    .select("*", { count: "exact", head: true })
    .eq("endorsee_id", userId);

  const nftsPromise = supabase
    .from("intents")
    .select("*", { count: "exact", head: true })
    .eq("author_id", userId)
    .not("nft_token_id", "is", null);

  const savedPromise = isOwner
    ? supabase
        .from("saved_intents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
    : Promise.resolve({ count: 0 } as { count: number });

  const connectionsPromise = isOwner
    ? supabase
        .from("connection_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    : Promise.resolve({ count: 0 } as { count: number });

  const [endorsementsRes, nftsRes, savedRes, connectionsRes] = await Promise.all([
    endorsementsPromise,
    nftsPromise,
    savedPromise,
    connectionsPromise,
  ]);

  return {
    endorsements: endorsementsRes.count ?? 0,
    nfts: nftsRes.count ?? 0,
    saved: savedRes.count ?? 0,
    connections: connectionsRes.count ?? 0,
  };
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
  // Session authorization
  const sessionId = await getSessionUserId();
  if (input.id !== sessionId) throw new Error("Not authorized");

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
  if (input.telegram_handle) {
    // Strip leading @ if present
    input.telegram_handle = input.telegram_handle.replace(/^@/, "");
    if (!/^[a-zA-Z0-9_]{1,32}$/.test(input.telegram_handle)) {
      throw new Error("Invalid Telegram handle");
    }
  }

  const supabase = createAdminClient();

  await assertDisplayNameAvailable(supabase, input.display_name, input.id);

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
    throw humanizeProfileWriteError(error);
  }

  const profile = data as Profile;

  trackServerEvent(profile.id, "signup_completed", {
    account_type: profile.account_type,
    twitter_verified: profile.twitter_verified,
    has_wallet: !!profile.wallet_address,
  });

  // Mint onboarding NFT in the background if wallet is present and not already minted
  if (profile.wallet_address && !profile.onboarding_nft_tx) {
    const profileId = profile.id;
    const walletAddress = profile.wallet_address;
    (async () => {
      try {
        await supabase
          .from("profiles")
          .update({ onboarding_mint_status: "pending", onboarding_mint_attempts: 1 })
          .eq("id", profileId);

        const txHash = await mintOnboardingNFT(walletAddress);
        if (txHash) {
          await supabase
            .from("profiles")
            .update({ onboarding_nft_tx: txHash, onboarding_mint_status: "success" })
            .eq("id", profileId);
        } else {
          await supabase
            .from("profiles")
            .update({ onboarding_mint_status: "skipped" })
            .eq("id", profileId);
        }
      } catch (err) {
        console.error("[onboarding-nft] mint failed:", err);
        await supabase
          .from("profiles")
          .update({ onboarding_mint_status: "failed" })
          .eq("id", profileId)
          .then(() => {});
      }
    })();
  } else if (!profile.wallet_address) {
    // No wallet — mark as skipped
    supabase
      .from("profiles")
      .update({ onboarding_mint_status: "skipped" })
      .eq("id", profile.id)
      .then(() => {});
  }

  return profile;
}

export async function updateProfile(
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
  const userId = await getSessionUserId();

  if (updates.display_name !== undefined) {
    if (updates.display_name.trim().length < 1 || updates.display_name.length > 100) {
      throw new Error("Display name must be 1-100 characters");
    }
  }
  if (updates.bio && updates.bio.length > 500) {
    throw new Error("Bio must be 500 characters or fewer");
  }
  if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
    throw new Error("Invalid email format");
  }
  if (updates.telegram_handle) {
    updates.telegram_handle = updates.telegram_handle.replace(/^@/, "");
    if (!/^[a-zA-Z0-9_]{1,32}$/.test(updates.telegram_handle)) {
      throw new Error("Invalid Telegram handle");
    }
  }

  const supabase = createAdminClient();

  if (updates.display_name !== undefined) {
    await assertDisplayNameAvailable(supabase, updates.display_name, userId);
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw humanizeProfileWriteError(error);
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

export async function calculateResponseRate(): Promise<number> {
  const userId = await getSessionUserId();
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
