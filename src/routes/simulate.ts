import { Router } from "express";
import { isAddress, parseAbi, encodeFunctionData } from "viem";
import { z } from "zod";
import { getClient } from "../viemClients.js";
import { ok, err } from "../respond.js";

const router = Router();

const SimulateBody = z.object({
  chain: z.string().optional().default("mainnet"),
  to: z.string().refine(isAddress, { message: "Invalid 'to' address" }),
  from: z.string().refine(isAddress, { message: "Invalid 'from' address" }).optional(),
  value: z.string().optional(),          // ETH in wei as string
  abi: z.array(z.string()),              // Human-readable ABI fragments
  functionName: z.string(),
  args: z.array(z.unknown()).optional().default([]),
});

// POST /v1/simulate
// Body: { chain, to, from, value, abi, functionName, args }
router.post("/", async (req, res) => {
  const start = Date.now();
  const parsed = SimulateBody.safeParse(req.body);
  if (!parsed.success) {
    return err(res, 400, "VALIDATION_ERROR", parsed.error.issues.map((i) => i.message).join("; "));
  }

  const { chain, to, from, value, abi: abiFragments, functionName, args } = parsed.data;

  try {
    const client = getClient(chain);
    const abi = parseAbi(abiFragments);

    const result = await client.simulateContract({
      address: to as `0x${string}`,
      abi,
      functionName,
      args: args as unknown[],
      account: from as `0x${string}` | undefined,
      value: value ? BigInt(value) : undefined,
    });

    const gasEstimate = await client.estimateContractGas({
      address: to as `0x${string}`,
      abi,
      functionName,
      args: args as unknown[],
      account: from as `0x${string}` | undefined,
      value: value ? BigInt(value) : undefined,
    }).catch(() => null);

    const data = {
      success: true,
      result: String(result.result),
      gasEstimate: gasEstimate?.toString() ?? null,
      revertReason: null,
    };
    return ok(res, data, { chain, cached: false, latency_ms: Date.now() - start });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const isRevert = msg.toLowerCase().includes("revert") || msg.toLowerCase().includes("execution reverted");
    if (isRevert) {
      return ok(res, {
        success: false,
        result: null,
        gasEstimate: null,
        revertReason: msg,
      }, { chain, cached: false, latency_ms: Date.now() - start });
    }
    return err(res, 502, "RPC_ERROR", msg, chain);
  }
});

export { router as simulateRouter };
