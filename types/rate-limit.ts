import type { NextResponse } from "next/server";

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimiterOptions {
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimiter {
  /**
   * Check if the request should be rate-limited.
   * Returns a 429 NextResponse if blocked, or null if allowed.
   */
  check: (request: Request) => NextResponse | null;
}
