import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string compare for secrets. A length mismatch short-circuits
 * (the only thing it leaks is length), and equal-length inputs are compared
 * without an early-exit byte loop, so response time doesn't reveal how many
 * bytes matched. Inputs over 512 chars are rejected before allocating a
 * Buffer, so a caller can't force large allocations.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length > 512) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
