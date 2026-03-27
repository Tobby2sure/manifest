// ── Enums ──

export type IntentType =
  | "partnership"
  | "investment"
  | "integration"
  | "hiring"
  | "co-marketing"
  | "grant"
  | "ecosystem-support"
  | "beta-testers";

export type Ecosystem =
  | "ethereum"
  | "base"
  | "solana"
  | "arbitrum"
  | "optimism"
  | "polygon"
  | "avalanche"
  | "bnb-chain"
  | "cosmos"
  | "multi-chain";

export type Sector =
  | "defi"
  | "infrastructure"
  | "gaming"
  | "social"
  | "dao-tooling"
  | "nft"
  | "ai"
  | "security"
  | "identity"
  | "payments";

export type IntentPriority = "Open" | "Active" | "Urgent";

export type IntentLifecycleStatus =
  | "active"
  | "in_discussion"
  | "partnership_formed"
  | "closed";

export type IntentClosedReason =
  | "expired"
  | "fulfilled"
  | "cancelled"
  | "no_responses";

export type AccountType = "individual" | "organization";

export type ConnectionRequestStatus = "pending" | "accepted" | "declined";

// ── Interfaces ──

export interface Profile {
  id: string;
  display_name: string | null;
  bio: string | null;
  twitter_handle: string | null;
  twitter_id: string | null;
  twitter_verified: boolean;
  wallet_address: string | null;
  telegram_handle: string | null;
  email: string | null;
  account_type: AccountType;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  twitter_handle: string | null;
  twitter_id: string | null;
  twitter_verified: boolean;
  created_by: string;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  profile_id: string;
  role: string;
  joined_at: string;
}

export interface Intent {
  id: string;
  author_id: string;
  org_id: string | null;
  type: IntentType;
  content: string;
  ecosystem: Ecosystem | null;
  sector: Sector | null;
  priority: IntentPriority;
  expires_at: string;
  lifecycle_status: IntentLifecycleStatus;
  closed_reason: IntentClosedReason | null;
  nft_token_id: string | null;
  nft_tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntentWithAuthor extends Intent {
  author: Profile;
}

export interface ConnectionRequest {
  id: string;
  intent_id: string;
  sender_id: string;
  receiver_id: string;
  pitch_message: string;
  status: ConnectionRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface SavedIntent {
  id: string;
  user_id: string;
  intent_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// ── Config records ──

export const INTENT_TYPE_CONFIG: Record<
  IntentType,
  { label: string; color: string; description: string }
> = {
  partnership: {
    label: "Partnership",
    color: "bg-blue-500/20 text-blue-400",
    description: "Looking for a strategic partner to build together",
  },
  investment: {
    label: "Investment",
    color: "bg-green-500/20 text-green-400",
    description: "Raising capital or seeking investors",
  },
  integration: {
    label: "Integration",
    color: "bg-purple-500/20 text-purple-400",
    description: "Technical integration with another protocol or tool",
  },
  hiring: {
    label: "Hiring",
    color: "bg-yellow-500/20 text-yellow-400",
    description: "Looking for specific talent or contributors",
  },
  "co-marketing": {
    label: "Co-marketing",
    color: "bg-pink-500/20 text-pink-400",
    description: "Joint campaigns, announcements, or content collabs",
  },
  grant: {
    label: "Grant",
    color: "bg-emerald-500/20 text-emerald-400",
    description: "Offering or seeking grant funding",
  },
  "ecosystem-support": {
    label: "Ecosystem Support",
    color: "bg-cyan-500/20 text-cyan-400",
    description: "Offering or seeking ecosystem resources, BD, intros",
  },
  "beta-testers": {
    label: "Beta Testers",
    color: "bg-orange-500/20 text-orange-400",
    description: "Looking for early users or testers",
  },
};

export const ECOSYSTEM_CONFIG: Record<
  Ecosystem,
  { label: string; color: string; description: string }
> = {
  ethereum: {
    label: "Ethereum",
    color: "bg-indigo-500/20 text-indigo-400",
    description: "Ethereum mainnet ecosystem",
  },
  base: {
    label: "Base",
    color: "bg-blue-500/20 text-blue-400",
    description: "Coinbase L2",
  },
  solana: {
    label: "Solana",
    color: "bg-purple-500/20 text-purple-400",
    description: "Solana ecosystem",
  },
  arbitrum: {
    label: "Arbitrum",
    color: "bg-sky-500/20 text-sky-400",
    description: "Arbitrum L2",
  },
  optimism: {
    label: "Optimism",
    color: "bg-red-500/20 text-red-400",
    description: "Optimism L2",
  },
  polygon: {
    label: "Polygon",
    color: "bg-violet-500/20 text-violet-400",
    description: "Polygon ecosystem",
  },
  avalanche: {
    label: "Avalanche",
    color: "bg-rose-500/20 text-rose-400",
    description: "Avalanche ecosystem",
  },
  "bnb-chain": {
    label: "BNB Chain",
    color: "bg-amber-500/20 text-amber-400",
    description: "Binance Smart Chain",
  },
  cosmos: {
    label: "Cosmos",
    color: "bg-slate-500/20 text-slate-400",
    description: "Cosmos / IBC ecosystem",
  },
  "multi-chain": {
    label: "Multi-chain",
    color: "bg-gray-500/20 text-gray-400",
    description: "Cross-chain or chain-agnostic",
  },
};

export const SECTOR_CONFIG: Record<
  Sector,
  { label: string; color: string; description: string }
> = {
  defi: {
    label: "DeFi",
    color: "bg-green-500/20 text-green-400",
    description: "Decentralized finance",
  },
  infrastructure: {
    label: "Infrastructure",
    color: "bg-gray-500/20 text-gray-400",
    description: "Core infra, RPCs, indexers, oracles",
  },
  gaming: {
    label: "Gaming",
    color: "bg-fuchsia-500/20 text-fuchsia-400",
    description: "Web3 gaming and metaverse",
  },
  social: {
    label: "Social",
    color: "bg-pink-500/20 text-pink-400",
    description: "Decentralized social and community",
  },
  "dao-tooling": {
    label: "DAO Tooling",
    color: "bg-teal-500/20 text-teal-400",
    description: "Governance and DAO infrastructure",
  },
  nft: {
    label: "NFT",
    color: "bg-orange-500/20 text-orange-400",
    description: "NFTs, digital collectibles, and creator tools",
  },
  ai: {
    label: "AI",
    color: "bg-cyan-500/20 text-cyan-400",
    description: "AI x crypto intersection",
  },
  security: {
    label: "Security",
    color: "bg-red-500/20 text-red-400",
    description: "Smart contract and protocol security",
  },
  identity: {
    label: "Identity",
    color: "bg-indigo-500/20 text-indigo-400",
    description: "Decentralized identity and reputation",
  },
  payments: {
    label: "Payments",
    color: "bg-emerald-500/20 text-emerald-400",
    description: "Crypto payments and on/off ramps",
  },
};
