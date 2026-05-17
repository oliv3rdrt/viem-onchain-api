import { Router } from "express";
import { isAddress, isHex, pad, toHex } from "viem";
import { getClient } from "../viemClients.js";
import * as cache from "../cache.js";
import { ok, err } from "../respond.js";

const router = Router();

function parseSlot(raw: string): `0x${string}` | null {
  // Accept either a hex string ("0x...") or a decimal number, and pad to 32 bytes.
  if (raw.startsWith("0x")) {
    if (!isHex(raw)) return null;
    return pad(raw as `0x${string}`, { size: 32 });
  }
  try {
    return pad(toHex(BigInt(raw)), { size: 32 });
  } catch {
    return null;
  }
}

// GET /v1/storage/:address/:slot?chain=mainnet
router.get("/:address/:slot", async (req, res) => {
  const start = Date.now();
  const { address, slot: rawSlot } = req.params;
  const chain = (req.query.chain as string) ?? "mainnet";

  if (!isAddress(address)) {
    return err(res, 400, "INVALID_ADDRESS", `"${address}" is not a valid EVM address`, chain);
  }
  const slot = parseSlot(rawSlot);
  if (!slot) {
    return err(res, 400, "INVALID_SLOT", `"${rawSlot}" is not a valid slot (hex or decimal)`, chain);
  }

  const cacheKey = cache.make("storage", chain, address.toLowerCase(), slot);
  const cached = cache.get<object>(cacheKey);
  if (cached) {
    return ok(res, cached, { chain, cached: true, latency_ms: Date.now() - start });
  }

  try {
    const client = getClient(chain);
    const value = await client.getStorageAt({ address, slot });
    const data = {
      address,
      slot,
      value: value ?? `0x${"0".repeat(64)}`,
      // Also surface the value as uint256 - handy for slot-0 single-uint state vars
      asUint: BigInt(value ?? "0x0").toString(),
    };
    // 10s - storage moves per block but rarely interesting that fast
    cache.set(cacheKey, data, 10);
    return ok(res, data, { chain, cached: false, latency_ms: Date.now() - start });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(res, 502, "RPC_ERROR", msg, chain);
  }
});

export { router as storageRouter };
