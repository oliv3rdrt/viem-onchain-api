import type { Response } from "express";
import type { ApiResponse, ApiError, ResponseMeta } from "./types.js";

export function ok<T>(
  res: Response,
  data: T,
  meta: Omit<ResponseMeta, "timestamp">
): void {
  const body: ApiResponse<T> = {
    ok: true,
    data,
    meta: { ...meta, timestamp: Date.now() },
  };
  res.json(body);
}

export function err(
  res: Response,
  status: number,
  code: string,
  message: string,
  chain = "unknown"
): void {
  const body: ApiError = {
    ok: false,
    error: { code, message },
    meta: { chain, cached: false, latency_ms: 0, timestamp: Date.now() },
  };
  res.status(status).json(body);
}
