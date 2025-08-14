import { NextRequest } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimitKey(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const path = new URL(req.url).pathname;
  return `${ip}:${path}`;
}

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry) {
    rateMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

export function validateCsrf(req: NextRequest): boolean {
  const origin = req.headers.get("origin") || "";
  const host = new URL(req.url).origin;
  return origin === host || origin === "";
}