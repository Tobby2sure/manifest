import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

const PROOF_OF_INTENT_ABI = parseAbi([
  "function mint(address to, string calldata intentId) external returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function intentIdOf(uint256 tokenId) external view returns (string)",
  "event IntentMinted(uint256 indexed tokenId, address indexed to, string intentId)",
]);

const ONBOARDING_NFT_ABI = parseAbi([
  "function mint(address to) external returns (uint256)",
]);

// Shared config: returns null when either the contract address or the
// deployer key isn't set, so callers can `if (!config) return null` and
// degrade gracefully instead of crashing the request.
function getSignerConfig(contractEnvVar: "PROOF_OF_INTENT_CONTRACT" | "ONBOARDING_NFT_CONTRACT") {
  const contractAddress = process.env[contractEnvVar];
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!contractAddress || !deployerKey) {
    return null;
  }

  // Accept the key with or without "0x" — pasted keys often arrive bare.
  const normalizedKey = deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`;

  const useTestnet = process.env.NEXT_PUBLIC_USE_TESTNET === "true";
  const chain = useTestnet ? baseSepolia : base;
  const account = privateKeyToAccount(normalizedKey as `0x${string}`);

  const publicClient = createPublicClient({ chain, transport: http() });
  const walletClient = createWalletClient({ chain, transport: http(), account });

  return {
    contractAddress: contractAddress as `0x${string}`,
    publicClient,
    walletClient,
    account,
    chain,
  };
}

/**
 * Mint a Proof of Intent NFT to the user's wallet.
 * Returns { txHash, tokenId } on success, or null if minting is not configured.
 */
export async function mintProofOfIntent(
  toAddress: string,
  intentId: string
): Promise<{ txHash: string; tokenId: string } | null> {
  const config = getSignerConfig("PROOF_OF_INTENT_CONTRACT");
  if (!config) {
    console.warn("[NFT] PROOF_OF_INTENT_CONTRACT or DEPLOYER_PRIVATE_KEY not set — skipping");
    return null;
  }

  try {
    const { contractAddress, publicClient, walletClient } = config;

    const totalSupply = await publicClient.readContract({
      address: contractAddress,
      abi: PROOF_OF_INTENT_ABI,
      functionName: "totalSupply",
    });
    const tokenId = totalSupply.toString();

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: PROOF_OF_INTENT_ABI,
      functionName: "mint",
      args: [toAddress as `0x${string}`, intentId],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { txHash, tokenId };
  } catch (error) {
    console.error("[NFT] mintProofOfIntent failed:", error);
    return null;
  }
}

/**
 * Mint an onboarding NFT to a newly-created profile's wallet.
 * Returns the tx hash on success, or null if not configured / failed.
 */
export async function mintOnboardingNFT(
  toAddress: string
): Promise<Hash | null> {
  const config = getSignerConfig("ONBOARDING_NFT_CONTRACT");
  if (!config) {
    console.warn("[NFT] ONBOARDING_NFT_CONTRACT or DEPLOYER_PRIVATE_KEY not set — skipping");
    return null;
  }

  try {
    const { contractAddress, publicClient, walletClient } = config;

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: ONBOARDING_NFT_ABI,
      functionName: "mint",
      args: [toAddress as `0x${string}`],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return txHash;
  } catch (error) {
    console.error("[NFT] mintOnboardingNFT failed:", error);
    return null;
  }
}

/**
 * Deployer wallet balance in ETH on the active chain. Null if not configured.
 */
export async function getDeployerBalance(): Promise<number | null> {
  const config = getSignerConfig("PROOF_OF_INTENT_CONTRACT");
  if (!config) return null;

  try {
    const balance = await config.publicClient.getBalance({
      address: config.account.address,
    });
    return Number(balance) / 1e18;
  } catch {
    return null;
  }
}
