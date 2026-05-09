```
        _                
 __   _(_) ___ _ __ ___  
 \ \ / / |/ _ \ '_ ` _ \ 
  \ V /| |  __/ | | | | |
   \_/ |_|\___|_| |_| |_|
                         
  Type-safe Ethereum client + REST API
```

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org)
[![viem](https://img.shields.io/badge/viem-2.x-007acc.svg)](https://viem.sh)
[![Express](https://img.shields.io/badge/Express-5.x-blue.svg)](https://expressjs.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Two things in one repo:

1. **Scripts** that exercise viem's read APIs (chain reads, multicall, ENS, event watching).
2. An **Express REST API** that wraps the same viem client and exposes the
   on-chain world over HTTP, with response envelopes, TTL caching, rate
   limiting, and request validation.

---

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [API Reference](#api-reference)
- [Response envelope](#response-envelope)
- [Caching strategy](#caching-strategy)
- [Rate limiting](#rate-limiting)
- [Standalone scripts](#standalone-scripts)
- [Configuration](#configuration)
- [Why viem over ethers](#why-viem-over-ethers)
- [Troubleshooting](#troubleshooting)
- [References](#references)

---

## Architecture

```
                        ┌─────────────────────────────────┐
                        │           HTTP client           │
                        └────────────────┬────────────────┘
                                         │
                                         ▼
        ┌────────────────────────────────────────────────────────────┐
        │                    Express server (server.ts)               │
        │                                                             │
        │   ┌──────────┐  cors  ┌──────────┐  rate-limit  ┌────────┐  │
        │   │  router  │◄──────│ middleware│◄────────────│ zod    │  │
        │   └────┬─────┘        └──────────┘              │ valid. │  │
        │        │                                         └────────┘  │
        │        ▼                                                     │
        │   ┌──────────────────────────────────────────────────────┐   │
        │   │   routes/  balance · block · ens · token · events    │   │
        │   │            simulate                                  │   │
        │   └────────────┬─────────────────────────┬───────────────┘   │
        │                │                         │                   │
        │                ▼                         ▼                   │
        │     ┌────────────────────┐     ┌────────────────────┐        │
        │     │  node-cache (TTL)  │     │  viem PublicClient │        │
        │     └────────────────────┘     └─────────┬──────────┘        │
        └─────────────────────────────────────────┬┼───────────────────┘
                                                  ▼▼
                                       ┌─────────────────────┐
                                       │  Ethereum RPC node  │
                                       └─────────────────────┘
```

## Prerequisites

| Tool    | Version | Notes                                              |
|---------|---------|----------------------------------------------------|
| Node.js | 18+     | Native fetch, top-level await, ESM-friendly        |
| npm     | 9+      | Yarn or pnpm work too                              |
| RPC URL | any     | Alchemy, Infura, QuickNode, or self-hosted geth/erigon |

## Quick start

```bash
git clone https://github.com/DRT23-mod/viem-playground.git
cd viem-playground
npm install
cp .env.example .env       # paste in MAINNET_RPC_URL and SEPOLIA_RPC_URL
npm run dev                # tsx watch, server on :3001
```

Then in another terminal:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/v1/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
curl http://localhost:3001/v1/ens/resolve/vitalik.eth
```

## Project structure

```
viem-playground/
├── src/
│   ├── server.ts          # express app, middleware, route mount
│   ├── viemClients.ts     # PublicClient per chain
│   ├── config.ts          # chains, cache TTLs, well-known tokens, port
│   ├── cache.ts           # node-cache wrapper with namespaced keys
│   ├── respond.ts         # ok() / err() with response envelope
│   ├── types.ts           # ApiResponse<T>, ApiError, domain types
│   ├── routes/
│   │   ├── balance.ts     # GET  /v1/balance/:address
│   │   ├── block.ts       # GET  /v1/block/latest, /v1/block/:number
│   │   ├── ens.ts         # GET  /v1/ens/resolve/:name, /reverse/:address
│   │   ├── token.ts       # GET  /v1/token/:addr  +  /balance/:holder
│   │   ├── events.ts      # GET  /v1/events/transfers/:token
│   │   └── simulate.ts    # POST /v1/simulate
│   ├── readChain.ts       # standalone script: balances, multicall, ENS
│   ├── watchEvents.ts     # standalone script: live USDC Transfer log
│   ├── client.ts          # plain viem client used by the scripts
│   └── ethereum.d.ts      # window.ethereum type for browser usage
├── tsconfig.json          # NodeNext, ES2022, strict
├── .env.example
└── README.md
```

## API Reference

### `GET /health`
Service status, uptime, cache hit/miss counters.

```bash
curl http://localhost:3001/health
```

### `GET /v1/balance/:address`
ETH balance in wei, ether, gwei.

| Param   | In    | Type    | Notes                          |
|---------|-------|---------|--------------------------------|
| address | path  | hex     | 0x-prefixed 20-byte address    |
| chain   | query | string  | `mainnet` (default) or `sepolia` |

```bash
curl "http://localhost:3001/v1/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?chain=mainnet"
```

### `GET /v1/block/latest` and `GET /v1/block/:number`
Block header info. Historical blocks are cached for 1 hour because they are
immutable once finalized.

### `GET /v1/ens/resolve/:name`
Forward ENS resolution. Returns address and avatar.

```bash
curl http://localhost:3001/v1/ens/resolve/vitalik.eth
```

### `GET /v1/ens/reverse/:address`
Reverse ENS lookup. Returns name and avatar (if name has a `text("avatar")` set).

### `GET /v1/token/:address`
ERC-20 metadata via multicall: `name`, `symbol`, `decimals`, `totalSupply`.

```bash
# USDC
curl http://localhost:3001/v1/token/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```

### `GET /v1/token/:address/balance/:holder`
Holder's token balance, formatted with the token's decimals.

### `GET /v1/events/transfers/:token`
Recent ERC-20 `Transfer` events.

| Param  | In    | Default | Notes                                |
|--------|-------|---------|--------------------------------------|
| token  | path  |         | ERC-20 contract address              |
| chain  | query | mainnet |                                      |
| blocks | query | 500     | Look-back window (max 2000)          |
| limit  | query | 25      | Max events returned (max 100)        |
| from   | query |         | Filter: only transfers FROM this addr|
| to     | query |         | Filter: only transfers TO this addr  |

```bash
curl "http://localhost:3001/v1/events/transfers/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48?blocks=200&limit=10"
```

### `POST /v1/simulate`
Simulate any contract call before broadcasting.

```bash
curl -X POST http://localhost:3001/v1/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "mainnet",
    "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "abi": ["function balanceOf(address) view returns (uint256)"],
    "functionName": "balanceOf",
    "args": ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"]
  }'
```

If the simulated call reverts, the response is still 200 with
`success: false` and `revertReason`.

## Response envelope

Every successful response:

```json
{
  "ok": true,
  "data": { ... },
  "meta": {
    "chain": "mainnet",
    "cached": true,
    "latency_ms": 4,
    "timestamp": 1716000000000
  }
}
```

Every error:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_ADDRESS",
    "message": "\"0xBAD\" is not a valid EVM address"
  },
  "meta": { "chain": "mainnet", "cached": false, "latency_ms": 0, "timestamp": ... }
}
```

| HTTP code | Meaning                                          |
|-----------|--------------------------------------------------|
| 200       | Success (including simulated reverts)            |
| 400       | Invalid input (bad address, malformed body)      |
| 404       | Block / route not found                          |
| 429       | Rate limit exceeded                              |
| 502       | Upstream RPC error                               |

## Caching strategy

| Resource           | TTL    | Why                                    |
|--------------------|--------|----------------------------------------|
| ETH balance        | 10s    | Changes every block (~12s)             |
| Latest block       | 5s     | Block time is ~12s                     |
| Historical block   | 1 hour | Immutable once finalized               |
| ENS resolve        | 5 min  | Records change rarely                  |
| ENS reverse        | 5 min  | Same                                   |
| Token info         | 10 min | `symbol`, `decimals`, `name` are immutable |
| Token balance      | 15s    | Changes per tx                         |
| Transfer events    | 30s    | New events per block                   |

Cache key shape: `<namespace>:<chain>:<arg1>:<arg2>...` for example
`balance:mainnet:0xd8da...96045`.

## Rate limiting

Default: **60 requests per minute per IP** (express-rate-limit). Override with
`RATE_LIMIT_RPM=120` in `.env`. Rate-limit headers are returned per the
[IETF draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/):

```
RateLimit-Limit: 60
RateLimit-Remaining: 59
RateLimit-Reset: 53
```

## Standalone scripts

The original viem reads still run as one-shot scripts (no server needed):

```bash
npm run read    # tsx src/readChain.ts  -> balances, multicall, ENS
npm run watch   # tsx src/watchEvents.ts -> live USDC Transfer logs
```

## Configuration

| Env var            | Default | Notes                                       |
|--------------------|---------|---------------------------------------------|
| `MAINNET_RPC_URL`  | _(req)_ | HTTP RPC endpoint for mainnet               |
| `SEPOLIA_RPC_URL`  | _(req)_ | HTTP RPC endpoint for sepolia               |
| `PORT`             | 3001    | Server port                                 |
| `RATE_LIMIT_RPM`   | 60      | Requests per minute per IP                  |

## Why viem over ethers

| Concern          | viem                                  | ethers v6                       |
|------------------|---------------------------------------|---------------------------------|
| Type safety      | ABI-level inference (return types)    | Manual typing or TypeChain      |
| Bundle size      | Tree-shakable, ~30 kB                 | ~200 kB monolithic              |
| Multicall        | First-class `client.multicall(...)`   | Manual via `Multicall3` calldata|
| Simulate->Write  | `simulateContract` + `writeContract`  | `staticCall` then `send`        |
| ENS              | `getEnsAddress`, `getEnsAvatar`       | `lookupAddress`, `resolveName`  |
| Native BigInt    | yes                                   | yes (v6)                        |

## Troubleshooting

**`Type instantiation is excessively deep` from ox / viem**
Set `"skipLibCheck": true` in `tsconfig.json`. Already configured here.

**`Cannot find name 'process'`**
Install `@types/node`. Already in devDependencies.

**429 from your RPC provider**
Lower your fuzz/event-poll rate, or move to a paid tier. The cache layer here
absorbs a lot but cannot help on cache misses.

**Server starts but every request returns `RPC_ERROR`**
You forgot to set `MAINNET_RPC_URL` in `.env`. The viem `http()` transport
falls back to `cloudflare-eth.com` which heavily rate-limits.

## References

- [viem docs](https://viem.sh)
- [Express v5 docs](https://expressjs.com)
- [zod](https://zod.dev)
- [node-cache](https://github.com/node-cache/node-cache)

## License

MIT
