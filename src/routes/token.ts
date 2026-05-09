import { Router } from "express";
import { isAddress, erc20Abi, formatUnits } from "viem";
import { getClient } from "../viemClients.js";
import * as cache from "../cache.js";
import { ok, err } from "../respond.js";
import { CACHE_TTL } from "../config.js";

const router = Router();

// GET /v1/token/:address?chain=mainnet
router.get("/:token", async (req, res) => {
  const start = Date.now();
  const token = req.params.token as `0x${string}`;
  const chain = (req.query.chain as string) ?? "mainnet";

  if (!isAddress(token)) {
    return err(res, 400, "INVALID_ADDRESS", `"${token}" is not a valid token address`, chain);
  }

  const cacheKey = cache.make("token:info", chain, token.toLowerCase());
  const cached = cache.get<object>(cacheKey);
  if (cached) {
    return ok(res, cached, { chain, cached: true, latency_ms: Date.now() - start });
  }

  try {
    const client = getClient(chain);
    const [name, symbol, decimals, totalSupply] = await client.multicall({
      contracts: [
        { address: token, abi: erc20Abi, functionName: "name" },
        { address: token, abi: erc20Abi, functionName: "symbol" },
        { address: token, abi: erc20Abi, functionName: "decimals" },
        { address: token, abi: erc20Abi, functionName: "totalSupply" },
      ],
      allowFailure: false,
    });

    const data = {
      address: token,
      name,
      symbol,
      decimals,
      totalSupply: (totalSupply as bigint).toString(),
      totalSupplyFormatted: formatUnits(totalSupply as bigint, decimals as number),
    };
    cache.set(cacheKey, data, CACHE_TTL.tokenInfo);
    return ok(res, data, { chain, cached: false, latency_ms: Date.now() - start });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(res, 502, "RPC_ERROR", msg, chain);
  }
});

// GET /v1/token/:address/balance/:holder?chain=mainnet
router.get("/:token/balance/:holder", async (req, res) => {
  const start = Date.now();
  const token = req.params.token as `0x${string}`;
  const holder = req.params.holder as `0x${string}`;
  const chain = (req.query.chain as string) ?? "mainnet";

  if (!isAddress(token)) return err(res, 400, "INVALID_ADDRESS", `Invalid token address`, chain);
  if (!isAddress(holder)) return err(res, 400, "INVALID_ADDRESS", `Invalid holder address`, chain);

  const cacheKey = cache.make("token:balance", chain, token.toLowerCase(), holder.toLowerCase());
  const cached = cache.get<object>(cacheKey);
  if (cached) {
    return ok(res, cached, { chain, cached: true, latency_ms: Date.now() - start });
  }

  try {
    const client = getClient(chain);
    const [balance, symbol, decimals] = await client.multicall({
      contracts: [
        { address: token, abi: erc20Abi, functionName: "balanceOf", args: [holder] },
        { address: token, abi: erc20Abi, functionName: "symbol" },
        { address: token, abi: erc20Abi, functionName: "decimals" },
      ],
      allowFailure: false,
    });

    const data = {
      holder,
      token,
      symbol,
      decimals,
      raw: (balance as bigint).toString(),
      formatted: formatUnits(balance as bigint, decimals as number),
    };
    cache.set(cacheKey, data, CACHE_TTL.tokenBalance);
    return ok(res, data, { chain, cached: false, latency_ms: Date.now() - start });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(res, 502, "RPC_ERROR", msg, chain);
  }
});

export { router as tokenRouter };
