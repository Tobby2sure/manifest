/**
 * Deploy ProofOfIntent ERC-721 to Base Sepolia.
 *
 * Run with:
 *   npx tsx scripts/deploy-proof-of-intent.ts
 *
 * Requires DEPLOYER_PRIVATE_KEY in .env.local (with or without 0x prefix).
 * Uses viem + solc so no Foundry/Hardhat required.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import solc from "solc";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  type Abi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const REPO_ROOT = path.resolve(__dirname, "..");

function findUpwards(startDir: string, rel: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, rel);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const NODE_MODULES =
  findUpwards(process.cwd(), "node_modules/@openzeppelin")?.replace(/\/@openzeppelin$/, "") ??
  path.join(REPO_ROOT, "node_modules");

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), "utf-8");
}

// solc import callback: resolves `@openzeppelin/contracts/...` and relative
// imports against node_modules / the contracts dir.
function resolveImport(importPath: string): { contents?: string; error?: string } {
  try {
    let abs: string;
    if (importPath.startsWith("@")) {
      abs = path.join(NODE_MODULES, importPath);
    } else if (path.isAbsolute(importPath)) {
      abs = importPath;
    } else {
      abs = path.join(REPO_ROOT, "contracts", importPath);
    }
    return { contents: fs.readFileSync(abs, "utf-8") };
  } catch (e) {
    return { error: `not found: ${importPath} (${e instanceof Error ? e.message : e})` };
  }
}

function compile() {
  const input = {
    language: "Solidity",
    sources: {
      "ProofOfIntent.sol": { content: readSource("contracts/ProofOfIntent.sol") },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode.object"] },
      },
    },
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: resolveImport })
  );

  const errors = (output.errors ?? []).filter(
    (e: { severity: string }) => e.severity === "error"
  );
  if (errors.length > 0) {
    for (const err of errors) console.error(err.formattedMessage ?? err);
    throw new Error("Compilation failed");
  }

  const contract = output.contracts["ProofOfIntent.sol"]["ProofOfIntent"];
  if (!contract) throw new Error("ProofOfIntent artifact not in compiler output");

  return {
    abi: contract.abi as Abi,
    bytecode: ("0x" + contract.evm.bytecode.object) as Hex,
  };
}

function loadDotenv() {
  // Walk up from cwd looking for .env.local, so this works from a git worktree.
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
  if (!envPath) {
    const repoEnv = path.join(REPO_ROOT, ".env.local");
    if (fs.existsSync(repoEnv)) envPath = repoEnv;
  }
  if (!envPath) return;
  console.log(`Loading env from: ${envPath}`);
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const raw of lines) {
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

function normalizeKey(raw: string): Hex {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("DEPLOYER_PRIVATE_KEY is empty in .env.local");
  const withPrefix = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(withPrefix)) {
    throw new Error(`DEPLOYER_PRIVATE_KEY malformed — expected 64 hex chars, got length ${trimmed.length}`);
  }
  return withPrefix as Hex;
}

async function main() {
  loadDotenv();

  const pk = normalizeKey(process.env.DEPLOYER_PRIVATE_KEY ?? "");
  const account = privateKeyToAccount(pk);
  console.log(`Deployer: ${account.address}`);

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
  const walletClient = createWalletClient({ chain: baseSepolia, transport: http(), account });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Base Sepolia balance: ${formatEther(balance)} ETH`);

  const minWei = BigInt(2_000_000_000_000_000); // 0.002 ETH
  if (balance < minWei) {
    throw new Error(
      `Insufficient balance. Fund ${account.address} at a Base Sepolia faucet (need ≥ 0.002 ETH).`
    );
  }

  console.log("Compiling ProofOfIntent.sol…");
  const { abi, bytecode } = compile();
  console.log(`  bytecode size: ${(bytecode.length - 2) / 2} bytes`);

  console.log("Deploying…");
  const baseURI = "";
  const txHash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [baseURI],
  });
  console.log(`  tx: https://sepolia.basescan.org/tx/${txHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error("Deploy transaction reverted");
  }

  console.log("\n✅ Deployed.");
  console.log(`Contract: ${receipt.contractAddress}`);
  console.log(`Basescan: https://sepolia.basescan.org/address/${receipt.contractAddress}`);
  console.log("\nAdd to /Users/bond/manifest/.env.local:");
  console.log(`  PROOF_OF_INTENT_CONTRACT=${receipt.contractAddress}`);
  console.log(`  NEXT_PUBLIC_USE_TESTNET=true`);
}

main().catch((e) => {
  console.error("\n❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
