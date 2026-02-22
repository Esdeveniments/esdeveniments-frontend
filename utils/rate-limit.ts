import { NextResponse } from "next/server";
import type {
  RateLimitEntry,
  RateLimiterOptions,
  RateLimiter,
} from "types/rate-limit";

/**
 * Lightweight in-memory rate limiter for API routes.
 *
 * Uses a sliding-window counter per IP. Safe for single-instance deployments
 * (Lambda / single container). For multi-instance, move to Redis or DynamoDB.
 *
 * Memory is bounded: entries expire after `windowMs` and are lazily pruned
 * every `PRUNE_INTERVAL_MS` (default 60s).
 *
 * Usage:
 *   const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 });
 *   // In route handler:
 *   const blocked = limiter.check(request);
 *   if (blocked) return blocked; // NextResponse 429
 */

const PRUNE_INTERVAL_MS = 60_000;

/**
 * Extract client IP from request headers.
 *
 * Prefer x-real-ip (set by trusted proxy like CloudFront/ALB).
 * Fall back to the LAST entry in x-forwarded-for, which is the one
 * appended by the outermost trusted proxy (the first entry is
 * client-controlled and can be spoofed to bypass rate limiting).
 */
function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",");
    return ips[ips.length - 1]?.trim() || "unknown";
  }

  return "unknown";
}

export function createRateLimiter({
  maxRequests,
  windowMs,
}: RateLimiterOptions): RateLimiter {
  const map = new Map<string, RateLimitEntry>();
  let lastPrune = Date.now();

  function prune(now: number) {
    if (now - lastPrune < PRUNE_INTERVAL_MS) return;
    lastPrune = now;
    for (const [key, entry] of map) {
      if (now >= entry.resetAt) map.delete(key);
    }
  }

  function check(request: Request): NextResponse | null {
    const now = Date.now();
    prune(now);

    const ip = getClientIp(request);
    const entry = map.get(ip);

    if (!entry || now >= entry.resetAt) {
      map.set(ip, { count: 1, resetAt: now + windowMs });
      return null;
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        },
      );
    }

    return null;
  }

  return { check };
}
