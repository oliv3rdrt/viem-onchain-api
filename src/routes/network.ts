import { Router } from "express";
import { getClient } from "../viemClients.js";
import * as cache from "../cache.js";
import { ok, err } from "../respond.js";
import { SUPPORTED_CHAINS } from "../config.js";

const router = Router();

// GET /v1/network?chain=mainnet
router.get("/", async (req, res) => {
  const start = Date.now();
  const chain = (req.query.chain as string) ?? "mainnet";

  const chainDef = SUPPORTED_CHAINS[chain];
  if (!chainDef) {
    return err(
      res,
      400,
      "UNSUPPORTED_CHAIN",
      `Chain "${chain}" not configured. Supported: ${Object.keys(SUPPORTED_CHAINS).join(", ")}`,
      chain
    );
  }

  const cacheKey = cache.make("network", chain);
  const cached = cache.get<object>(cacheKey);
  if (cached) {
    return ok(res, cached, { chain, cached: true, latency_ms: Date.now() - start });
  }

  try {
    const client = getClient(chain);
    const [latestBlock, chainId] = await Promise.all([
      client.getBlockNumber(),
      client.getChainId(),
    ]);

    const data = {
      name: chainDef.name,
      chainId,
      latestBlock: latestBlock.toString(),
      nativeCurrency: chainDef.nativeCurrency,
      blockExplorers: chainDef.blockExplorers ?? null,
      isTestnet: chainDef.testnet ?? false,
    };
    // Short TTL - latestBlock moves each block
    cache.set(cacheKey, data, 5);
    return ok(res, data, { chain, cached: false, latency_ms: Date.now() - start });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(res, 502, "RPC_ERROR", msg, chain);
  }
});

export { router as networkRouter };
