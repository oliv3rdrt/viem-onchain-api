import { Router } from "express";
import { isAddress, parseAbiItem, formatUnits, erc20Abi } from "viem";
import { getClient } from "../viemClients.js";
import * as cache from "../cache.js";
import { ok, err } from "../respond.js";
import { CACHE_TTL } from "../config.js";

const router = Router();

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

// GET /v1/events/transfers/:tokenAddress?chain=mainnet&blocks=500&limit=50&from=0x...&to=0x...
router.get("/transfers/:token", async (req, res) => {
  const start = Date.now();
  const token = req.params.token as `0x${string}`;
  const chain = (req.query.chain as string) ?? "mainnet";
  const blockRange = Math.min(Number(req.query.blocks ?? 500), 2000);
  const limit = Math.min(Number(req.query.limit ?? 25), 100);
  const filterFrom = req.query.from as `0x${string}` | undefined;
  const filterTo = req.query.to as `0x${string}` | undefined;

  if (!isAddress(token)) {
    return err(res, 400, "INVALID_ADDRESS", `Invalid token address`, chain);
  }

  const cacheKey = cache.make(
    "events:transfers",
    chain, token.toLowerCase(),
    blockRange, limit,
    filterFrom ?? "", filterTo ?? ""
  );
  const cached = cache.get<object>(cacheKey);
  if (cached) {
    return ok(res, cached, { chain, cached: true, latency_ms: Date.now() - start });
  }

  try {
    const client = getClient(chain);
    const latestBlock = await client.getBlockNumber();
    const fromBlock = latestBlock - BigInt(blockRange);

    const [logs, decimals] = await Promise.all([
      client.getLogs({
        address: token,
        event: transferEvent,
        args: {
          ...(filterFrom ? { from: filterFrom } : {}),
          ...(filterTo ? { to: filterTo } : {}),
        },
        fromBlock,
        toBlock: latestBlock,
      }),
      client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "decimals",
      }),
    ]);

    const events = logs.slice(-limit).map((log) => ({
      blockNumber: log.blockNumber?.toString() ?? "pending",
      transactionHash: log.transactionHash,
      from: log.args.from,
      to: log.args.to,
      value: (log.args.value ?? 0n).toString(),
      valueFormatted: formatUnits(log.args.value ?? 0n, decimals),
    }));

    const data = {
      token,
      blockRange: { from: fromBlock.toString(), to: latestBlock.toString() },
      totalFound: logs.length,
      returned: events.length,
      events,
    };
    cache.set(cacheKey, data, CACHE_TTL.events);
    return ok(res, data, { chain, cached: false, latency_ms: Date.now() - start });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(res, 502, "RPC_ERROR", msg, chain);
  }
});

export { router as eventsRouter };
