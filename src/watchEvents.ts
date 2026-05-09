import { parseAbiItem } from "viem";
import { publicClient } from "./client.js";

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

// Watch USDC Transfer events in real-time
const unwatch = publicClient.watchEvent({
  address: USDC,
  event: transferEvent,
  onLogs(logs) {
    for (const log of logs) {
      const { from, to, value } = log.args;
      console.log(`USDC Transfer: ${from} → ${to} | ${value}`);
    }
  },
});

// Stop watching after 30 seconds
setTimeout(() => {
  unwatch();
  console.log("Stopped watching");
}, 30_000);
