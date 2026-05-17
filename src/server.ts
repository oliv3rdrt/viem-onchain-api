import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { balanceRouter } from "./routes/balance.js";
import { blockRouter } from "./routes/block.js";
import { codeRouter } from "./routes/code.js";
import { ensRouter } from "./routes/ens.js";
import { tokenRouter } from "./routes/token.js";
import { eventsRouter } from "./routes/events.js";
import { gasRouter } from "./routes/gas.js";
import { simulateRouter } from "./routes/simulate.js";
import { txRouter } from "./routes/tx.js";
import { stats } from "./cache.js";
import { PORT, RATE_LIMIT_RPM, SUPPORTED_CHAINS } from "./config.js";

const app = express();
const startTime = Date.now();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "..", "web");

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 60_000,
    max: RATE_LIMIT_RPM,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: { code: "RATE_LIMITED", message: "Too many requests - try again in a minute." } },
  })
);

// ─── Static web UI ────────────────────────────────────────────────────────────
app.use(express.static(WEB_DIR));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/v1/balance", balanceRouter);
app.use("/v1/block", blockRouter);
app.use("/v1/code", codeRouter);
app.use("/v1/ens", ensRouter);
app.use("/v1/token", tokenRouter);
app.use("/v1/events", eventsRouter);
app.use("/v1/gas", gasRouter);
app.use("/v1/simulate", simulateRouter);
app.use("/v1/tx", txRouter);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    uptime_ms: Date.now() - startTime,
    chains: Object.keys(SUPPORTED_CHAINS),
    cache: stats(),
    version: "1.0.0",
  });
});

// ─── API manifest (was at /, moved aside so / serves the web UI) ──────────────
app.get("/api", (_req, res) => {
  res.json({
    name: "viem-playground API",
    version: "1.0.0",
    description: "On-chain data via viem - balances, ENS, tokens, events, simulation",
    endpoints: {
      health: "GET  /health",
      balance: "GET  /v1/balance/:address?chain=mainnet",
      block_latest: "GET  /v1/block/latest?chain=mainnet",
      block_by_number: "GET  /v1/block/:number?chain=mainnet",
      ens_resolve: "GET  /v1/ens/resolve/:name",
      ens_reverse: "GET  /v1/ens/reverse/:address",
      token_info: "GET  /v1/token/:address?chain=mainnet",
      token_balance: "GET  /v1/token/:address/balance/:holder?chain=mainnet",
      transfers: "GET  /v1/events/transfers/:token?chain=mainnet&blocks=500&limit=25",
      gas: "GET  /v1/gas?chain=mainnet",
      code: "GET  /v1/code/:address?chain=mainnet",
      tx: "GET  /v1/tx/:hash?chain=mainnet",
      simulate: "POST /v1/simulate",
    },
    example_requests: {
      vitalik_balance: "/v1/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      ens_resolve: "/v1/ens/resolve/vitalik.eth",
      usdc_info: "/v1/token/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      latest_block: "/v1/block/latest",
    },
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Route not found" } });
});

// ─── Error boundary ───────────────────────────────────────────────────────────
app.use((e: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(e);
  res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: e.message } });
});

app.listen(PORT, () => {
  console.log(`\n🔗 viem-playground`);
  console.log(`   Web UI: http://localhost:${PORT}`);
  console.log(`   API:    http://localhost:${PORT}/api`);
  console.log(`   Chains: ${Object.keys(SUPPORTED_CHAINS).join(", ")}`);
  console.log(`   Rate limit: ${RATE_LIMIT_RPM} req/min\n`);
});

export default app;
