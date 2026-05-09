import { createPublicClient, http } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { SUPPORTED_CHAINS } from "./config.js";

const clients = {
  mainnet: createPublicClient({
    chain: mainnet,
    transport: http(process.env.MAINNET_RPC_URL),
  }),
  sepolia: createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  }),
};

export function getClient(chain: string) {
  const client = clients[chain as keyof typeof clients];
  if (!client) {
    throw new Error(
      `Unsupported chain "${chain}". Supported: ${Object.keys(SUPPORTED_CHAINS).join(", ")}`
    );
  }
  return client;
}

export { clients };
