import { Router } from "express";
import { isAddress } from "viem";
import { getClient } from "../viemClients.js";
import * as cache from "../cache.js";
import { ok, err } from "../respond.js";
import { CACHE_TTL } from "../config.js";

const router = Router();

// GET /v1/ens/resolve/:name  →  address + avatar
router.get("/resolve/:name", async (req, res) => {
  const start = Date.now();
  const { name } = req.params;

  if (!name.endsWith(".eth") && !name.includes(".")) {
    return err(res, 400, "INVALID_ENS_NAME", `"${name}" doesn't look like a valid ENS name`);
  }

  const cacheKey = cache.make("ens:resolve", name.toLowerCase());
  const cached = cache.get<object>(cacheKey);
  if (cached) {
    return ok(res, cached, { chain: "mainnet", cached: true, latency_ms: Date.now() - start });
  }

  try {
    const client = getClient("mainnet");
    const [address, avatar] = await Promise.all([
      client.getEnsAddress({ name }),
      client.getEnsAvatar({ name }).catch(() => null),
    ]);
    const data = { name, address, avatar };
    cache.set(cacheKey, data, CACHE_TTL.ensResolve);
    return ok(res, data, { chain: "mainnet", cached: false, latency_ms: Date.now() - start });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(res, 502, "RPC_ERROR", msg, "mainnet");
  }
});

// GET /v1/ens/reverse/:address  →  ENS name + avatar
router.get("/reverse/:address", async (req, res) => {
  const start = Date.now();
  const { address } = req.params;

  if (!isAddress(address)) {
    return err(res, 400, "INVALID_ADDRESS", `"${address}" is not a valid EVM address`);
  }

  const cacheKey = cache.make("ens:reverse", address.toLowerCase());
  const cached = cache.get<object>(cacheKey);
  if (cached) {
    return ok(res, cached, { chain: "mainnet", cached: true, latency_ms: Date.now() - start });
  }

  try {
    const client = getClient("mainnet");
    const name = await client.getEnsName({ address });
    const avatar = name ? await client.getEnsAvatar({ name }).catch(() => null) : null;
    const data = { address, name, avatar };
    cache.set(cacheKey, data, CACHE_TTL.ensReverse);
    return ok(res, data, { chain: "mainnet", cached: false, latency_ms: Date.now() - start });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(res, 502, "RPC_ERROR", msg, "mainnet");
  }
});

export { router as ensRouter };
