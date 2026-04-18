/**
 * Test-mint a ProofOfIntent NFT against the deployed contract.
 *
 *   npx tsx scripts/test-mint.ts
 *
 * Mints to the deployer address (self-mint) with a dummy intent ID, so no
 * profile/DB changes needed. Verifies the env wiring + contract wiring end-to-end.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

function loadDotenv() {
  let dir = process.cwd();
  let envPath: string | null = null;
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, ".env.local");
    if (fs.existsSync(candidate)) {
      envPath = candidate;
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (!envPath) return;
  for (const raw of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq);
    let val = line.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

const ABI = parseAbi([
  "function mint(address to, string calldata intentId) external returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function intentIdOf(uint256 tokenId) external view returns (string)",
  "function balanceOf(address owner) external view returns (uint256)",
  "event IntentMinted(uint256 indexed tokenId, address indexed to, string intentId)",
]);

async function main() {
  loadDotenv();

  const pkRaw = (process.env.DEPLOYER_PRIVATE_KEY ?? "").trim();
  const pk = (pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`) as Hex;
  const contract = process.env.PROOF_OF_INTENT_CONTRACT as `0x${string}` | undefined;

  if (!contract) throw new Error("PROOF_OF_INTENT_CONTRACT not set");
  if (!pk || pk.length !== 66) throw new Error("DEPLOYER_PRIVATE_KEY invalid");

  const account = privateKeyToAccount(pk);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
  const walletClient = createWalletClient({ chain: baseSepolia, transport: http(), account });

  console.log(`Contract: ${contract}`);
  console.log(`Minter/receiver (deployer): ${account.address}`);

  const before = (await publicClient.readContract({
    address: contract,
    abi: ABI,
    functionName: "totalSupply",
  })) as bigint;
  console.log(`totalSupply before: ${before}`);

  const intentId = `test-${Date.now()}`;
  console.log(`Minting with intentId="${intentId}"…`);

  const txHash = await walletClient.writeContract({
    address: contract,
    abi: ABI,
    functionName: "mint",
    args: [account.address, intentId],
  });
  console.log(`  tx: https://sepolia.basescan.org/tx/${txHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("Mint tx reverted");
  }

  const after = (await publicClient.readContract({
    address: contract,
    abi: ABI,
    functionName: "totalSupply",
  })) as bigint;
  console.log(`totalSupply after: ${after} (Δ = ${after - before})`);

  // Token id of the newly minted one = after - 1
  const tokenId = after - BigInt(1);
  const storedIntent = (await publicClient.readContract({
    address: contract,
    abi: ABI,
    functionName: "intentIdOf",
    args: [tokenId],
  })) as string;
  const balance = (await publicClient.readContract({
    address: contract,
    abi: ABI,
    functionName: "balanceOf",
    args: [account.address],
  })) as bigint;

  console.log(`tokenId: ${tokenId}`);
  console.log(`intentIdOf(${tokenId}): "${storedIntent}"`);
  console.log(`balanceOf(${account.address}): ${balance}`);

  // Sanity: soulbound — transferFrom should revert
  console.log("\nSoulbound sanity check — attempting transferFrom (should revert)…");
  try {
    await publicClient.simulateContract({
      address: contract,
      abi: parseAbi(["function transferFrom(address from, address to, uint256 tokenId) external"]),
      functionName: "transferFrom",
      args: [account.address, "0x0000000000000000000000000000000000000001", tokenId],
      account,
    });
    console.log("  ❌ transfer succeeded — NOT soulbound!");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("soulbound")) {
      console.log("  ✓ transfer reverts: soulbound protection works");
    } else {
      console.log(`  ✓ transfer reverts: ${msg.split("\n")[0]}`);
    }
  }

  console.log("\n✅ Mint test passed.");
}

main().catch((e) => {
  console.error("\n❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
