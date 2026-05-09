import { Router } from "express";
import { isAddress, formatEther, formatGwei } from "viem";
import { getClient } from "../viemClients.js";
import * as cache from "../cache.js";
import { ok, err } from "../respond.js";
import { CACHE_TTL } from "../config.js";

const router = Router();

// GET /v1/balance/:address?chain=mainnet
router.get("/:address", async (req, res) => {
  const start = Date.now();
  const { address } = req.params;
  const chain = (req.query.chain as string) ?? "mainnet";

  if (!isAddress(address)) {
    return err(res, 400, "INVALID_ADDRESS", `"${address}" is not a valid EVM address`, chain);
  }

  const cacheKey = cache.make("balance", chain, address.toLowerCase());
  const cached = cache.get<object>(cacheKey);
  if (cached) {
    return ok(res, cached, { chain, cached: true, latency_ms: Date.now() - start });
  }

  try {
    const client = getClient(chain);
    const wei = await client.getBalance({ address });
    const data = {
      address,
      wei: wei.toString(),
      ether: formatEther(wei),
      gwei: formatGwei(wei),
    };
    cache.set(cacheKey, data, CACHE_TTL.balance);
    return ok(res, data, { chain, cached: false, latency_ms: Date.now() - start });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(res, 502, "RPC_ERROR", msg, chain);
  }
});

export { router as balanceRouter };
