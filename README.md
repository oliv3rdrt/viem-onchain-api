# viem-playground - On-Chain REST API

A typed Express server wrapping [viem](https://viem.sh) into a clean HTTP API. Lets you query Ethereum state - balances, ENS, tokens, events, and transaction simulation - from any HTTP client.

## Start

```bash
cp .env.example .env   # add your RPC URLs
npm run dev            # tsx watch - hot reload
```

Server starts at **http://localhost:3001**

## Endpoints

### `GET /health`
```json
{ "ok": true, "status": "healthy", "uptime_ms": 3412, "cache": { "hits": 12, "misses": 4 } }
```

---

### `GET /v1/balance/:address?chain=mainnet`
ETH balance in wei, ether, and gwei.

```bash
curl http://localhost:3001/v1/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```
```json
{
  "ok": true,
  "data": { "address": "0xd8dA...", "wei": "1234567890000000000", "ether": "1.23456789", "gwei": "1234567890.0" },
  "meta": { "chain": "mainnet", "cached": false, "latency_ms": 142, "timestamp": 1716000000000 }
}
```

---

### `GET /v1/block/latest?chain=mainnet`
### `GET /v1/block/:number?chain=mainnet`
```bash
curl http://localhost:3001/v1/block/latest
curl http://localhost:3001/v1/block/20000000
```

---

### `GET /v1/ens/resolve/:name`
ENS name → address + avatar.
```bash
curl http://localhost:3001/v1/ens/resolve/vitalik.eth
```
```json
{ "ok": true, "data": { "name": "vitalik.eth", "address": "0xd8dA...", "avatar": "https://..." } }
```

### `GET /v1/ens/reverse/:address`
Address → ENS name + avatar.
```bash
curl http://localhost:3001/v1/ens/reverse/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

---

### `GET /v1/token/:address?chain=mainnet`
ERC-20 token info - name, symbol, decimals, total supply.
```bash
# USDC
curl http://localhost:3001/v1/token/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```

### `GET /v1/token/:address/balance/:holder?chain=mainnet`
Holder's token balance, formatted.
```bash
curl http://localhost:3001/v1/token/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/balance/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

---

### `GET /v1/events/transfers/:token?chain=mainnet&blocks=500&limit=25&from=0x...&to=0x...`
Recent ERC-20 Transfer events in a block range.
```bash
# Last 200 USDC transfers
curl "http://localhost:3001/v1/events/transfers/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48?blocks=200&limit=10"

# Transfers FROM a specific address
curl "http://localhost:3001/v1/events/transfers/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48?from=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
```

---

### `POST /v1/simulate`
Simulate a contract call before broadcasting.
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
```json
{ "ok": true, "data": { "success": true, "result": "1234000000", "gasEstimate": "25432", "revertReason": null } }
```

## Response envelope

All responses follow:
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

Errors:
```json
{
  "ok": false,
  "error": { "code": "INVALID_ADDRESS", "message": "\"0xBAD\" is not a valid EVM address" }
}
```

## Cache TTLs

| Resource      | TTL   | Reason                            |
|---|---|---|
| ETH balance   | 10s   | Changes every block               |
| Block         | 5s    | New block every ~12s              |
| ENS resolve   | 5min  | Changes rarely                    |
| Token info    | 10min | symbol/decimals are immutable     |
| Token balance | 15s   | Changes per transaction           |
| Events        | 30s   | New events per block              |
| Hist. block   | 1hr   | Immutable once finalized          |

## Supported chains

Pass `?chain=mainnet` (default) or `?chain=sepolia` to any endpoint.

## Tech

- **viem** - typed chain reads, multicall, event parsing
- **Express v5** - HTTP server
- **node-cache** - in-memory TTL cache
- **zod** - request body validation
- **express-rate-limit** - 60 req/min default
