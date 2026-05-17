import type { NextFunction, Request, Response } from "express";

const COLOUR = {
  reset: "\x1b[0m",
  dim:   "\x1b[2m",
  green: "\x1b[32m",
  yellow:"\x1b[33m",
  red:   "\x1b[31m",
  cyan:  "\x1b[36m",
};

function statusColour(status: number): string {
  if (status >= 500) return COLOUR.red;
  if (status >= 400) return COLOUR.yellow;
  if (status >= 300) return COLOUR.cyan;
  return COLOUR.green;
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + " ".repeat(w - s.length);
}

/// Concise per-request logger. Skips noisy static-asset paths so the dev
/// console stays useful when the SPA loads.
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Don't spam logs for static SPA assets
  if (/\.(js|css|map|ico|png|svg|woff2?)$/.test(req.path)) {
    return next();
  }
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const colour = statusColour(res.statusCode);
    const status = `${colour}${res.statusCode}${COLOUR.reset}`;
    const method = pad(req.method, 4);
    const dur = `${COLOUR.dim}${ms}ms${COLOUR.reset}`;
    console.log(`${status} ${method} ${req.originalUrl}  ${dur}`);
  });
  next();
}
