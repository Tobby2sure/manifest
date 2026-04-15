import {
  createWalletClient,
  createPublicClient,
  http,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY as `0x${string}` | undefined;
const ONBOARDING_NFT_CONTRACT = process.env.ONBOARDING_NFT_CONTRACT as Address | undefined;
const INTENT_NFT_CONTRACT = process.env.INTENT_NFT_CONTRACT as Address | undefined;
const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";

const MINT_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
] as const;

function getMinterAccount() {
  if (!MINTER_PRIVATE_KEY) {
    throw new Error("MINTER_PRIVATE_KEY is not configured");
  }
  return privateKeyToAccount(MINTER_PRIVATE_KEY);
}

function getWalletClient() {
  const account = getMinterAccount();
  return createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC_URL),
  });
}

function getPublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(BASE_RPC_URL),
  });
}

/**
 * Mint an onboarding NFT to the given wallet address.
 * Returns the transaction hash, or null if minting is not configured.
 */
export async function mintOnboardingNFT(
  walletAddress: string
): Promise<Hash | null> {
  if (!ONBOARDING_NFT_CONTRACT || !MINTER_PRIVATE_KEY) {
    console.warn("[mint] Onboarding NFT minting not configured — skipping");
    return null;
  }

  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const hash = await walletClient.writeContract({
    address: ONBOARDING_NFT_CONTRACT,
    abi: MINT_ABI,
    functionName: "mint",
    args: [walletAddress as Address],
  });

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}

/**
 * Mint a proof-of-intent NFT to the given wallet address.
 * Returns { txHash, tokenId } or null if not configured.
 */
export async function mintProofOfIntentNFT(
  walletAddress: string
): Promise<{ txHash: Hash; tokenId: string } | null> {
  if (!INTENT_NFT_CONTRACT || !MINTER_PRIVATE_KEY) {
    console.warn("[mint] Intent NFT minting not configured — skipping");
    return null;
  }

  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const hash = await walletClient.writeContract({
    address: INTENT_NFT_CONTRACT,
    abi: MINT_ABI,
    functionName: "mint",
    args: [walletAddress as Address],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Extract tokenId from Transfer event log (ERC-721 Transfer topic)
  const transferTopic =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const transferLog = receipt.logs.find(
    (log) => log.topics[0] === transferTopic
  );
  const tokenId = transferLog?.topics[3]
    ? BigInt(transferLog.topics[3]).toString()
    : "0";

  return { txHash: hash, tokenId };
}
