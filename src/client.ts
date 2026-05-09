import { createPublicClient, createWalletClient, http, custom } from "viem";
import { mainnet, sepolia } from "viem/chains";

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.MAINNET_RPC_URL),
});

export const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL),
});

// Browser wallet client - used in frontend context
export function getBrowserWalletClient() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No browser wallet detected");
  }
  return createWalletClient({
    chain: mainnet,
    transport: custom(window.ethereum),
  });
}
