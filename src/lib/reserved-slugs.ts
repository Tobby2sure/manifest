/**
 * Reserved org slugs — must not be claimable by anyone creating an org.
 * Protects against impersonation of major brands, Manifest internal routes,
 * and common generic names.
 *
 * Also blocks anything matching our route segments (e.g. "feed", "org").
 */
export const RESERVED_SLUGS = new Set<string>([
  // Manifest internal routes
  "admin",
  "api",
  "app",
  "dashboard",
  "feed",
  "help",
  "home",
  "intents",
  "invite",
  "login",
  "manifest",
  "notifications",
  "onboarding",
  "org",
  "profile",
  "settings",
  "signin",
  "signup",
  "verify",
  "webhooks",

  // Trademark-adjacent generic terms
  "official",
  "support",
  "team",
  "contact",

  // Major crypto L1s/L2s
  "ethereum",
  "bitcoin",
  "solana",
  "base",
  "coinbase",
  "arbitrum",
  "optimism",
  "polygon",
  "avalanche",
  "bnb",
  "binance",
  "cosmos",
  "sui",
  "aptos",
  "near",
  "tron",
  "cardano",
  "polkadot",

  // Top protocols / DeFi
  "uniswap",
  "aave",
  "curve",
  "maker",
  "makerdao",
  "compound",
  "lido",
  "eigenlayer",
  "chainlink",
  "pyth",
  "thegraph",
  "rocketpool",
  "morpho",
  "pendle",
  "gmx",
  "jupiter",
  "raydium",
  "drift",

  // Major wallets / auth
  "metamask",
  "phantom",
  "rainbow",
  "coinbasewallet",
  "trustwallet",
  "ledger",
  "walletconnect",
  "dynamic",
  "privy",
  "magic",

  // Major infra
  "infura",
  "alchemy",
  "quicknode",
  "opensea",
  "blur",
  "etherscan",
  "basescan",
  "dune",
  "0x",

  // Stablecoins / CEXes
  "usdc",
  "usdt",
  "dai",
  "tether",
  "circle",
  "kraken",
  "okx",
  "bybit",
  "gemini",
  "bitmart",

  // VCs / Orgs
  "a16z",
  "a16zcrypto",
  "paradigm",
  "multicoin",
  "variant",
  "framework",
  "placeholder",
  "hackvc",
  "dragonfly",
  "polychain",
  "pantera",

  // Platforms / companies
  "twitter",
  "x",
  "meta",
  "facebook",
  "google",
  "apple",
  "microsoft",
  "amazon",
  "github",
  "vercel",
  "supabase",
  "anthropic",
  "openai",
  "claude",
  "chatgpt",

  // African crypto orgs (since target audience)
  "paystack",
  "flutterwave",
  "yellowcard",
  "mara",
  "busha",
  "jambo",
  "quidax",
  "afen",
]);

/**
 * Check if a slug is reserved. Case-insensitive.
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
