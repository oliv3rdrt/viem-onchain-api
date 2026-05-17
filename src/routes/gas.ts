import { Router } from "express";
import { formatGwei } from "viem";
import { getClient } from "../viemClients.js";
import * as cache from "../cache.js";
import { ok, err } from "../respond.js";
import { CACHE_TTL } from "../config.js";

const router = Router();

function format(wei: bigint) {
  return { wei: wei.toString(), gwei: formatGwei(wei) };
}

// GET /v1/gas?chain=mainnet
router.get("/", async (req, res) => {
  const start = Date.now();
  const chain = (req.query.chain as string) ?? "mainnet";

  const cacheKey = cache.make("gas", chain);
  const cached = cache.get<object>(cacheKey);
  if (cached) {
    return ok(res, cached, { chain, cached: true, latency_ms: Date.now() - start });
  }

  try {
    const client = getClient(chain);
    // Block is the source of baseFeePerGas; estimateFeesPerGas only returns
    // maxFeePerGas / maxPriorityFeePerGas under EIP-1559.
    const [gasPrice, fees, block] = await Promise.all([
      client.getGasPrice(),
      client.estimateFeesPerGas(),
      client.getBlock(),
    ]);

    const data = {
      gasPrice: format(gasPrice),
      baseFee: block.baseFeePerGas != null ? format(block.baseFeePerGas) : null,
      maxPriorityFee: format(fees.maxPriorityFeePerGas),
      maxFee: format(fees.maxFeePerGas),
    };
    cache.set(cacheKey, data, CACHE_TTL.gas);
    return ok(res, data, { chain, cached: false, latency_ms: Date.now() - start });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(res, 502, "RPC_ERROR", msg, chain);
  }
});

export { router as gasRouter };
