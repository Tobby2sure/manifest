/**
 * Seed Intent Script
 *
 * Creates 25-30 diverse intents for launch, spread across intent types
 * and ecosystems. Run with: npx tsx scripts/seed-intents.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 * Uses the first verified user found as the author, or pass --author-id=<id>.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SEED_INTENTS = [
  // Partnership (5)
  { type: "partnership", ecosystem: "base", sector: "defi",
    content: "DeFi protocol on Base looking for a strategic partnership with an oracle provider. We need reliable price feeds for our lending markets. Prefer teams already deployed on Base with sub-second update times." },
  { type: "partnership", ecosystem: "base", sector: "infrastructure",
    content: "Infrastructure project seeking partnership with wallet providers on Base. We've built an account abstraction SDK and want to integrate with leading wallets to offer gasless onboarding for dApps." },
  { type: "partnership", ecosystem: "ethereum", sector: "social",
    content: "Social protocol looking for a partnership with a decentralized identity solution. We want to integrate verifiable credentials into our platform so users can port reputation across apps." },
  { type: "partnership", ecosystem: "multi-chain", sector: "gaming",
    content: "Gaming studio building an on-chain RPG seeking partnership with NFT marketplace for in-game asset trading. Must support ERC-1155 batch transfers and gasless listings." },
  { type: "partnership", ecosystem: "base", sector: "payments",
    content: "Payments startup on Base looking for a banking partner to enable fiat on/off ramps. We process 10K+ transactions monthly and need a partner with strong compliance infrastructure." },

  // Integration (5)
  { type: "integration", ecosystem: "base", sector: "defi",
    content: "DEX aggregator on Base looking to integrate new liquidity sources. If your protocol has $1M+ TVL on Base and offers swap/routing APIs, we want to add you to our aggregation layer." },
  { type: "integration", ecosystem: "base", sector: "infrastructure",
    content: "Data indexing service seeking protocols on Base to integrate with our real-time event streaming API. We offer sub-second indexing with GraphQL endpoints. Free tier for early integrators." },
  { type: "integration", ecosystem: "arbitrum", sector: "defi",
    content: "Yield aggregator looking to integrate lending protocols on Arbitrum and Base. We auto-compound and rebalance across strategies. Need protocols with audited contracts and reliable APY data." },
  { type: "integration", ecosystem: "base", sector: "security",
    content: "Smart contract monitoring platform seeking integration partners on Base. We provide real-time alerts for on-chain anomalies. Looking for DeFi protocols that want proactive security monitoring." },
  { type: "integration", ecosystem: "solana", sector: "nft",
    content: "NFT analytics platform expanding to Base — looking for marketplaces and collections to integrate our rarity and floor price tracking. We already index 50M+ NFTs on Solana." },

  // Co-marketing (4)
  { type: "co-marketing", ecosystem: "base", sector: "defi",
    content: "DeFi protocol on Base launching new liquidity mining campaign. Looking for 2-3 protocols to co-promote and cross-incentivize. Willing to allocate portion of rewards to partner LPs." },
  { type: "co-marketing", ecosystem: "base", sector: "social",
    content: "Social dApp on Base with 15K MAU looking for co-marketing partners for our upcoming creator program launch. Ideal partner has an active Twitter presence and engaged community." },
  { type: "co-marketing", ecosystem: "multi-chain", sector: "gaming",
    content: "Web3 gaming guild looking for co-marketing partners for our cross-chain tournament series. We bring 5K+ active gamers and streaming reach. Seeking sponsors and game studio partners." },
  { type: "co-marketing", ecosystem: "base", sector: "infrastructure",
    content: "Developer tools company on Base seeking co-marketing for upcoming hackathon. Looking for projects to co-sponsor bounties and offer their APIs as building blocks for participants." },

  // Investment (4)
  { type: "investment", ecosystem: "base", sector: "defi",
    content: "Seed-stage DeFi protocol on Base raising $1.5M to build a novel perpetuals engine. Team of 4 ex-TradFi engineers. Looking for strategic investors who can also help with market-making partnerships." },
  { type: "investment", ecosystem: "base", sector: "ai",
    content: "AI x crypto startup building decentralized inference on Base. Raising pre-seed round. Our model marketplace lets developers monetize fine-tuned models with crypto-native payments." },
  { type: "investment", ecosystem: "ethereum", sector: "identity",
    content: "Decentralized identity startup seeking strategic investment. We've built a reputation protocol used by 3 DAOs with 10K+ verified members. Looking for investors with DAO ecosystem connections." },
  { type: "investment", ecosystem: "multi-chain", sector: "infrastructure",
    content: "Cross-chain messaging protocol raising Series A. Currently processing 100K+ messages/month across 5 chains. Looking for institutional investors with bridge and interoperability thesis." },

  // Hiring (3)
  { type: "hiring", ecosystem: "base", sector: "defi",
    content: "DeFi protocol on Base hiring a senior Solidity engineer. Must have experience with ERC-4626 vaults and liquidation mechanisms. Remote-first, token-based compensation available." },
  { type: "hiring", ecosystem: "base", sector: "social",
    content: "Social dApp on Base looking for a growth lead with Web3 BD experience. You'll own partnerships, community growth, and go-to-market strategy. Must have existing relationships in the Base ecosystem." },
  { type: "hiring", ecosystem: "multi-chain", sector: "infrastructure",
    content: "Infrastructure company hiring DevRel engineers for Base and Arbitrum ecosystems. You'll create tutorials, run workshops, and support developers building on our indexing platform." },

  // Grant (2)
  { type: "grant", ecosystem: "base", sector: "infrastructure",
    content: "Developer tooling project offering $5K grants to teams building open-source Base developer tools. We're funding block explorers, testing frameworks, and deployment pipelines. Apply with a 1-page proposal." },
  { type: "grant", ecosystem: "base", sector: "defi",
    content: "DeFi protocol offering grants for security researchers. Up to $10K per audit report for critical findings in our Base contracts. White-hat only. Details and scope on our security page." },

  // Ecosystem Support (2)
  { type: "ecosystem-support", ecosystem: "base", sector: "infrastructure",
    content: "Established infra provider offering free RPC endpoints and indexing to early-stage Base builders. If you're building on Base and need reliable infrastructure, reach out — we're supporting the first 50 projects." },
  { type: "ecosystem-support", ecosystem: "base", sector: "defi",
    content: "DeFi advisory firm offering go-to-market support for protocols launching on Base. We help with tokenomics review, launch strategy, and introductions to LPs and market makers. No upfront fees." },

  // Beta Testers (2)
  { type: "beta-testers", ecosystem: "base", sector: "social",
    content: "Social protocol launching beta on Base — looking for 50 power users to test our decentralized content curation system. Beta testers get founding member NFTs and early access to our token." },
  { type: "beta-testers", ecosystem: "base", sector: "defi",
    content: "New yield optimizer on Base seeking beta testers before public launch. Need DeFi-native users comfortable with testnet interactions and providing detailed feedback. Compensation in protocol tokens." },
];

async function main() {
  // Parse author-id from args
  const authorIdArg = process.argv.find(a => a.startsWith("--author-id="));
  let authorId = authorIdArg?.split("=")[1];

  if (!authorId) {
    // Find first verified user
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("twitter_verified", true)
      .limit(1);

    if (!profiles || profiles.length === 0) {
      console.error("No verified users found. Pass --author-id=<id> to specify an author.");
      process.exit(1);
    }
    authorId = profiles[0].id;
  }

  console.log(`Seeding ${SEED_INTENTS.length} intents as author: ${authorId}`);

  // Check how many intents already exist
  const { count: existingCount } = await supabase
    .from("intents")
    .select("*", { count: "exact", head: true });

  const currentCount = existingCount ?? 0;
  let created = 0;

  for (const intent of SEED_INTENTS) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 45); // 45-day expiry

    const isFounding = (currentCount + created) < 100;

    const { error } = await supabase.from("intents").insert({
      author_id: authorId,
      type: intent.type,
      content: intent.content,
      ecosystem: intent.ecosystem,
      sector: intent.sector,
      expires_at: expiresAt.toISOString(),
      lifecycle_status: "active",
      is_founding: isFounding,
    });

    if (error) {
      console.error(`Failed to create intent: ${error.message}`);
    } else {
      created++;
      console.log(`  [${created}/${SEED_INTENTS.length}] ${intent.type} — ${intent.ecosystem}/${intent.sector}`);
    }
  }

  console.log(`\nDone! Created ${created} intents.`);
  console.log(`Intent distribution:`);
  const typeCounts: Record<string, number> = {};
  for (const i of SEED_INTENTS) {
    typeCounts[i.type] = (typeCounts[i.type] ?? 0) + 1;
  }
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`  ${type}: ${count}`);
  }
}

main().catch(console.error);
