import { Router } from "express";
import { isAddress, keccak256 } from "viem";
import { getClient } from "../viemClients.js";
import * as cache from "../cache.js";
import { ok, err } from "../respond.js";

const router = Router();

// Deployed bytecode is immutable per address (unless SELFDESTRUCT'd and redeployed
// via CREATE2 - rare). Long TTL.
const TTL_SECONDS = 24 * 3600;

// GET /v1/code/:address?chain=mainnet
router.get("/:address", async (req, res) => {
  const start = Date.now();
  const { address } = req.params;
  const chain = (req.query.chain as string) ?? "mainnet";

  if (!isAddress(address)) {
    return err(res, 400, "INVALID_ADDRESS", `"${address}" is not a valid EVM address`, chain);
  }

  const cacheKey = cache.make("code", chain, address.toLowerCase());
  const cached = cache.get<object>(cacheKey);
  if (cached) {
    return ok(res, cached, { chain, cached: true, latency_ms: Date.now() - start });
  }

  try {
    const client = getClient(chain);
    const bytecode = await client.getCode({ address });
    const isContract = bytecode != null && bytecode !== "0x";

    const data = {
      address,
      isContract,
      bytecode: bytecode ?? "0x",
      sizeBytes: bytecode ? (bytecode.length - 2) / 2 : 0,
      codeHash: isContract ? keccak256(bytecode as `0x${string}`) : null,
    };
    cache.set(cacheKey, data, TTL_SECONDS);
    return ok(res, data, { chain, cached: false, latency_ms: Date.now() - start });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(res, 502, "RPC_ERROR", msg, chain);
  }
});

export { router as codeRouter };
