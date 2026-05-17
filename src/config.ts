import { mainnet, sepolia, type Chain } from "viem/chains";

export const SUPPORTED_CHAINS: Record<string, Chain> = {
  mainnet,
  sepolia,
};

export const DEFAULT_CHAIN = "mainnet";

export const CACHE_TTL = {
  balance: 10,        // 10s - changes per block
  block: 5,           // 5s - new block every ~12s
  gas: 5,             // 5s - moves with the block
  ensResolve: 300,    // 5min - ENS entries rarely change
  ensReverse: 300,
  tokenInfo: 600,     // 10min - symbol/decimals are immutable
  tokenBalance: 15,   // 15s
  events: 30,         // 30s
} as const;

export const WELL_KNOWN_TOKENS: Record<string, `0x${string}`> = {
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  DAI:  "0x6B175474E89094C44Da98b954EedeAC495271d0F",
};

export const PORT = Number(process.env.PORT ?? 3001);
export const RATE_LIMIT_RPM = Number(process.env.RATE_LIMIT_RPM ?? 60);
