import { Router } from "express";
import { isHash } from "viem";
import { getClient } from "../viemClients.js";
import * as cache from "../cache.js";
import { ok, err } from "../respond.js";

const router = Router();

function formatTx(tx: Awaited<ReturnType<ReturnType<typeof getClient>["getTransaction"]>>) {
  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: tx.value.toString(),
    nonce: tx.nonce,
    type: tx.type,
    gas: tx.gas.toString(),
    gasPrice: tx.gasPrice?.toString() ?? null,
    maxFeePerGas: tx.maxFeePerGas?.toString() ?? null,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString() ?? null,
    blockNumber: tx.blockNumber?.toString() ?? null,
    blockHash: tx.blockHash ?? null,
    transactionIndex: tx.transactionIndex ?? null,
    input: tx.input,
  };
}

function formatReceipt(rc: Awaited<ReturnType<ReturnType<typeof getClient>["getTransactionReceipt"]>>) {
  return {
    status: rc.status,
    gasUsed: rc.gasUsed.toString(),
    cumulativeGasUsed: rc.cumulativeGasUsed.toString(),
    effectiveGasPrice: rc.effectiveGasPrice.toString(),
    contractAddress: rc.contractAddress ?? null,
    logsCount: rc.logs.length,
    blockNumber: rc.blockNumber.toString(),
    blockHash: rc.blockHash,
  };
}

// GET /v1/tx/:hash?chain=mainnet
router.get("/:hash", async (req, res) => {
  const start = Date.now();
  const { hash } = req.params;
  const chain = (req.query.chain as string) ?? "mainnet";

  if (!isHash(hash)) {
    return err(res, 400, "INVALID_HASH", `"${hash}" is not a valid 0x-prefixed 32-byte hash`, chain);
  }

  const cacheKey = cache.make("tx", chain, hash.toLowerCase());
  const cached = cache.get<object>(cacheKey);
  if (cached) {
    return ok(res, cached, { chain, cached: true, latency_ms: Date.now() - start });
  }

  try {
    const client = getClient(chain);
    const [tx, receipt] = await Promise.all([
      client.getTransaction({ hash }).catch(() => null),
      client.getTransactionReceipt({ hash }).catch(() => null),
    ]);

    if (!tx && !receipt) {
      return err(res, 404, "TX_NOT_FOUND", `No transaction with hash ${hash}`, chain);
    }

    const data = {
      tx: tx ? formatTx(tx) : null,
      receipt: receipt ? formatReceipt(receipt) : null,
    };

    // Only cache once mined; pending txs change.
    if (receipt) cache.set(cacheKey, data, 3600);
    return ok(res, data, { chain, cached: false, latency_ms: Date.now() - start });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(res, 502, "RPC_ERROR", msg, chain);
  }
});

export { router as txRouter };
