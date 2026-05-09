import { Router } from "express";
import { getClient } from "../viemClients.js";
import * as cache from "../cache.js";
import { ok, err } from "../respond.js";
import { CACHE_TTL } from "../config.js";

const router = Router();

function formatBlock(block: Awaited<ReturnType<ReturnType<typeof getClient>["getBlock"]>>) {
  return {
    number: block.number?.toString() ?? "pending",
    hash: block.hash ?? null,
    timestamp: Number(block.timestamp),
    transactions: block.transactions.length,
    baseFeePerGas: block.baseFeePerGas?.toString() ?? null,
    gasUsed: block.gasUsed.toString(),
    gasLimit: block.gasLimit.toString(),
    miner: block.miner,
  };
}

// GET /v1/block/latest?chain=mainnet
router.get("/latest", async (req, res) => {
  const start = Date.now();
  const chain = (req.query.chain as string) ?? "mainnet";
  const cacheKey = cache.make("block:latest", chain);
  const cached = cache.get<object>(cacheKey);
  if (cached) {
    return ok(res, cached, { chain, cached: true, latency_ms: Date.now() - start });
  }

  try {
    const client = getClient(chain);
    const block = await client.getBlock();
    const data = formatBlock(block);
    cache.set(cacheKey, data, CACHE_TTL.block);
    return ok(res, data, { chain, cached: false, latency_ms: Date.now() - start });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(res, 502, "RPC_ERROR", msg, chain);
  }
});

// GET /v1/block/:number?chain=mainnet
router.get("/:number", async (req, res) => {
  const start = Date.now();
  const chain = (req.query.chain as string) ?? "mainnet";
  const num = BigInt(req.params.number);
  const cacheKey = cache.make("block", chain, req.params.number);
  const cached = cache.get<object>(cacheKey);
  if (cached) {
    return ok(res, cached, { chain, cached: true, latency_ms: Date.now() - start });
  }

  try {
    const client = getClient(chain);
    const block = await client.getBlock({ blockNumber: num });
    const data = formatBlock(block);
    // Historical blocks are immutable - cache indefinitely (1hr)
    cache.set(cacheKey, data, 3600);
    return ok(res, data, { chain, cached: false, latency_ms: Date.now() - start });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(res, e instanceof Error && e.message.includes("not found") ? 404 : 502, "RPC_ERROR", msg, chain);
  }
});

export { router as blockRouter };
