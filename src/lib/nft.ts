import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

const PROOF_OF_INTENT_ABI = parseAbi([
  "function mint(address to, string calldata intentId) external returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function intentIdOf(uint256 tokenId) external view returns (string)",
  "event IntentMinted(uint256 indexed tokenId, address indexed to, string intentId)",
]);

function getConfig() {
  const contractAddress = process.env.PROOF_OF_INTENT_CONTRACT;
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  const useTestnet = process.env.NEXT_PUBLIC_USE_TESTNET === "true";

  if (!contractAddress || !deployerKey) {
    return null;
  }

  const chain = useTestnet ? baseSepolia : base;
  const account = privateKeyToAccount(deployerKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const walletClient = createWalletClient({
    chain,
    transport: http(),
    account,
  });

  return {
    contractAddress: contractAddress as `0x${string}`,
    publicClient,
    walletClient,
    account,
    chain,
  };
}

/**
 * Mint a Proof of Intent NFT to a user's wallet address.
 * Returns the transaction hash, or null if minting is not configured.
 */
export async function mintProofOfIntent(
  toAddress: string,
  intentId: string
): Promise<{ txHash: string; tokenId: string } | null> {
  const config = getConfig();
  if (!config) {
    console.warn("[NFT] Minting not configured — skipping. Set PROOF_OF_INTENT_CONTRACT and DEPLOYER_PRIVATE_KEY.");
    return null;
  }

  try {
    const { contractAddress, publicClient, walletClient } = config;

    // Get current total supply to predict token ID
    const totalSupply = await publicClient.readContract({
      address: contractAddress,
      abi: PROOF_OF_INTENT_ABI,
      functionName: "totalSupply",
    });

    const tokenId = totalSupply.toString();

    // Send mint transaction
    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: PROOF_OF_INTENT_ABI,
      functionName: "mint",
      args: [toAddress as `0x${string}`, intentId],
    });

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { txHash, tokenId };
  } catch (error) {
    console.error("[NFT] Mint failed:", error);
    return null;
  }
}

/**
 * Check the deployer wallet balance on Base.
 * Returns balance in ETH as a number.
 */
export async function getDeployerBalance(): Promise<number | null> {
  const config = getConfig();
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
