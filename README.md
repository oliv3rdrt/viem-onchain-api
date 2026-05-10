# viem-onchain-api

TypeScript REST API exposing Ethereum data over HTTP using viem. Routes for balances, ENS, tokens, blocks, events, and transaction simulation.

## Stack

- TypeScript on Node.js 18+
- Express 5
- viem 2.x (PublicClient)
- node-cache (TTL), express-rate-limit, zod

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| RPC URL | any (Alchemy, Infura, self-hosted) |

## Quick start

```bash
npm install
cp .env.example .env
# set MAINNET_RPC_URL
npm run dev
```

API serves on http://localhost:3000. Open `/` for the web UI, or hit endpoints directly:

```bash
curl http://localhost:3000/v1/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
curl http://localhost:3000/v1/ens/vitalik.eth
curl http://localhost:3000/v1/block/latest
```

## Endpoints

| Route | Description |
|-------|-------------|
| `GET /v1/balance/:address` | ETH balance |
| `GET /v1/token/:contract/balance/:holder` | ERC-20 balance |
| `GET /v1/ens/:name` | ENS resolution |
| `GET /v1/block/:tag` | Block by number, hash, or `latest` |
| `GET /v1/events` | Event log queries with topics filter |
| `POST /v1/simulate` | Simulate a transaction without sending |

## What's in here

- `src/server.ts`: Express app setup, middleware
- `src/routes/`: one file per endpoint group
- `src/lib/cache.ts`: TTL cache wrapper
- `public/`: vanilla HTML/JS UI served by the same server
- `scripts/`: standalone viem scripts (no server required)

## Build

```bash
npm run build
npm start
```
