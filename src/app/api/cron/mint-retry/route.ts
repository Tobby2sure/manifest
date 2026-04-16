import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mintProofOfIntent } from "@/lib/nft";
import { mintOnboardingNFT } from "@/lib/mint";

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 20;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  let intentsMinted = 0;
  let intentsFailed = 0;
  let profilesMinted = 0;
  let profilesFailed = 0;

  // Retry failed/pending intent mints
  const { data: intents } = await supabase
    .from("intents")
    .select("id, author_id, mint_attempts")
    .in("mint_status", ["pending", "failed"])
    .lt("mint_attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  for (const intent of (intents ?? []) as Array<{ id: string; author_id: string; mint_attempts: number }>) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", intent.author_id)
      .single();

    if (!profile?.wallet_address) {
      await supabase
        .from("intents")
        .update({ mint_status: "skipped" })
        .eq("id", intent.id);
      continue;
    }

    try {
      await supabase
        .from("intents")
        .update({ mint_attempts: (intent.mint_attempts ?? 0) + 1 })
        .eq("id", intent.id);

      const result = await mintProofOfIntent(profile.wallet_address, intent.id);
      if (result) {
        await supabase
          .from("intents")
          .update({
            nft_token_id: result.tokenId,
            nft_tx_hash: result.txHash,
            mint_status: "success",
          })
          .eq("id", intent.id);
        intentsMinted++;
      } else {
        await supabase
          .from("intents")
          .update({ mint_status: "skipped" })
          .eq("id", intent.id);
      }
    } catch (e) {
      console.error(`[mint-retry] Intent ${intent.id} failed:`, e);
      await supabase
        .from("intents")
        .update({ mint_status: "failed" })
        .eq("id", intent.id);
      intentsFailed++;
    }
  }

  // Retry failed/pending onboarding mints
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, wallet_address, onboarding_mint_attempts")
    .in("onboarding_mint_status", ["pending", "failed"])
    .lt("onboarding_mint_attempts", MAX_ATTEMPTS)
    .not("wallet_address", "is", null)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  for (const prof of (profiles ?? []) as Array<{ id: string; wallet_address: string; onboarding_mint_attempts: number }>) {
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_mint_attempts: (prof.onboarding_mint_attempts ?? 0) + 1 })
        .eq("id", prof.id);

      const txHash = await mintOnboardingNFT(prof.wallet_address);
      if (txHash) {
        await supabase
          .from("profiles")
          .update({ onboarding_nft_tx: txHash, onboarding_mint_status: "success" })
          .eq("id", prof.id);
        profilesMinted++;
      } else {
        await supabase
          .from("profiles")
          .update({ onboarding_mint_status: "skipped" })
          .eq("id", prof.id);
      }
    } catch (e) {
      console.error(`[mint-retry] Profile ${prof.id} failed:`, e);
      await supabase
        .from("profiles")
        .update({ onboarding_mint_status: "failed" })
        .eq("id", prof.id);
      profilesFailed++;
    }
  }

  return NextResponse.json({
    ok: true,
    intents: { minted: intentsMinted, failed: intentsFailed, attempted: (intents ?? []).length },
    profiles: { minted: profilesMinted, failed: profilesFailed, attempted: (profiles ?? []).length },
  });
}
