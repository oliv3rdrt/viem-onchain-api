import { formatEther, parseAbi } from "viem";
import { publicClient } from "./client.js";

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;
const VITALIK = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as const;

const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function symbol() view returns (string)",
]);

async function main() {
  // Basic chain reads
  const blockNumber = await publicClient.getBlockNumber();
  const balance = await publicClient.getBalance({ address: VITALIK });

  console.log("Block:", blockNumber);
  console.log("Vitalik ETH balance:", formatEther(balance));

  // Typed contract read - TypeScript knows the return type is bigint
  const usdcBalance = await publicClient.readContract({
    address: USDC,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [VITALIK],
  });
  console.log("Vitalik USDC balance (raw):", usdcBalance);

  // ENS resolution
  const ensName = await publicClient.getEnsName({ address: VITALIK });
  console.log("ENS name:", ensName);

  // Multicall - batch reads in one RPC call
  const results = await publicClient.multicall({
    contracts: [
      { address: USDC, abi: erc20Abi, functionName: "symbol" },
      { address: USDC, abi: erc20Abi, functionName: "totalSupply" },
      { address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [VITALIK] },
    ],
  });
  console.log("Multicall results:", results);
}

main().catch(console.error);
