"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { deliverIntentWebhooks } from "@/lib/webhooks";
import { mintProofOfIntent } from "@/lib/nft";
import { trackServerEvent } from "@/lib/posthog";
import { getSessionUserId } from "@/lib/auth";
import { checkIntentCreationRateLimit } from "@/lib/rate-limit";
import type {
  Intent,
  IntentWithAuthor,
  IntentType,
  Ecosystem,
  Sector,
  IntentLifecycleStatus,
  IntentFilters,
} from "@/lib/types/database";

export async function getIntents(
  filters?: IntentFilters
): Promise<{ intents: IntentWithAuthor[]; total: number }> {
  const supabase = createAdminClient();
  const page = filters?.page ?? 0;
  const pageSize = filters?.pageSize ?? 20;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const activeOnly = filters?.activeOnly !== false;

  let query = supabase
    .from("intents")
    .select("*, author:profiles!author_id(*, org_memberships:org_members(role, organizations(*)))", { count: "exact" })
    .range(from, to);

  if (activeOnly) {
    query = query
      .eq("lifecycle_status", "active")
      .gte("expires_at", new Date().toISOString());
  }

  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.ecosystem) {
    query = query.eq("ecosystem", filters.ecosystem);
  }
  if (filters?.sector) {
    query = query.eq("sector", filters.sector);
  }
  if (filters?.search) {
    query = query.textSearch("content", filters.search, { type: "websearch" });
  }

  // Sort
  const sort = filters?.sort ?? "newest";
  if (sort === "ending_soon") {
    query = query.order("expires_at", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    intents: (data ?? []) as IntentWithAuthor[],
    total: count ?? 0,
  };
}

export async function getIntent(id: string): Promise<IntentWithAuthor | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("intents")
    .select("*, author:profiles!author_id(*, org_memberships:org_members(role, organizations(*)))")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as IntentWithAuthor;
}

export async function createIntent(input: {
  orgId?: string;
  type: IntentType;
  content: string;
  ecosystem: Ecosystem | null;
  sector: Sector | null;
  durationDays: number;
}): Promise<Intent> {
  const supabase = createAdminClient();
  const authorId = await getSessionUserId();

  // Cap daily intent creation per user. Each successful post triggers an
  // on-chain mint, so unlimited posting would be an attacker-controlled
  // gas-spend vector on the deployer wallet.
  // The limiter is best-effort in prod: surface "try again later" on
  // genuine rate-limit hits, but don't block legitimate posts if Upstash
  // itself errors (network, quota, etc.).
  try {
    await checkIntentCreationRateLimit(authorId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.toLowerCase().includes("limit of")) {
      throw e; // user genuinely hit the cap
    }
    console.error("[createIntent] rate limiter error (allowing through):", e);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + input.durationDays);

  // Check if this intent qualifies for the founding badge (first 100)
  const { count: intentCount } = await supabase
    .from("intents")
    .select("*", { count: "exact", head: true });
  const isFounding = (intentCount ?? 0) < 100;

  // Determine initial mint status
  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("id", authorId)
    .single();

  const hasWallet = !!authorProfile?.wallet_address;
  const mintConfigured = !!(process.env.PROOF_OF_INTENT_CONTRACT && process.env.DEPLOYER_PRIVATE_KEY);
  const initialMintStatus = (!hasWallet || !mintConfigured) ? "skipped" : "pending";

  const { data, error } = await supabase
    .from("intents")
    .insert({
      author_id: authorId,
      org_id: input.orgId ?? null,
      type: input.type,
      content: input.content,
      ecosystem: input.ecosystem,
      sector: input.sector,
      expires_at: expiresAt.toISOString(),
      lifecycle_status: "active",
      is_founding: isFounding,
      mint_status: initialMintStatus,
      mint_attempts: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Mint Proof of Intent NFT (non-blocking, with status tracking)
  if (initialMintStatus === "pending" && authorProfile?.wallet_address) {
    const intentId = data.id;
    const walletAddress = authorProfile.wallet_address;
    (async () => {
      try {
        await supabase
          .from("intents")
          .update({ mint_attempts: 1 })
          .eq("id", intentId);

        const result = await mintProofOfIntent(walletAddress, intentId);
        if (result) {
          await supabase
            .from("intents")
            .update({
              nft_token_id: result.tokenId,
              nft_tx_hash: result.txHash,
              mint_status: "success",
            })
            .eq("id", intentId);
        } else {
          await supabase
            .from("intents")
            .update({ mint_status: "skipped" })
            .eq("id", intentId);
        }
      } catch (e) {
        console.error("[NFT] Mint failed for intent:", intentId, e);
        await supabase
          .from("intents")
          .update({ mint_status: "failed" })
          .eq("id", intentId)
          .then(() => {});
      }
    })();
  }

  // Track event
  trackServerEvent(authorId, "intent_posted", {
    type: input.type,
    ecosystem: input.ecosystem,
    sector: input.sector,
    is_founding: isFounding,
  });

  // Fire webhooks (fire-and-forget)
  deliverIntentWebhooks(data as Intent);

  revalidatePath("/feed");
  return data as Intent;
}

export async function getIntentsByAuthor(
  authorId: string
): Promise<IntentWithAuthor[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("intents")
    .select("*, author:profiles!author_id(*, org_memberships:org_members(role, organizations(*)))")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as IntentWithAuthor[];
}

export async function getFoundingBadgeRemaining(): Promise<number> {
  const supabase = createAdminClient();

  const { count } = await supabase
    .from("intents")
    .select("*", { count: "exact", head: true });

  return Math.max(0, 100 - (count ?? 0));
}

export async function retryIntentMint(
  intentId: string
): Promise<void> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  const { data: intent } = await supabase
    .from("intents")
    .select("author_id, mint_status, mint_attempts")
    .eq("id", intentId)
    .single();

  if (!intent || intent.author_id !== userId) {
    throw new Error("Not authorized");
  }

  if (intent.mint_status === "success") {
    throw new Error("NFT already minted");
  }

  if ((intent.mint_attempts ?? 0) >= 5) {
    throw new Error("Maximum retry attempts reached");
  }

  await supabase
    .from("intents")
    .update({ mint_status: "pending" })
    .eq("id", intentId);

  revalidatePath("/feed");
  revalidatePath(`/profile/${userId}`);
}

export async function updateIntentLifecycle(
  intentId: string,
  status: IntentLifecycleStatus
): Promise<Intent> {
  const userId = await getSessionUserId();
  const supabase = createAdminClient();

  // Verify the user is the author or a connected party
  const { data: intent } = await supabase
    .from("intents")
    .select("author_id")
    .eq("id", intentId)
    .single();

  if (!intent || intent.author_id !== userId) {
    throw new Error("Not authorized to update this intent");
  }

  const { data, error } = await supabase
    .from("intents")
    .update({ lifecycle_status: status, updated_at: new Date().toISOString() })
    .eq("id", intentId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/feed");
  revalidatePath(`/profile/${userId}`);
  return data as Intent;
}
