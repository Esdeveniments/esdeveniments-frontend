import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRateLimiter } from "../utils/rate-limit";

function makeRequest(headers: Record<string, string> = {}): Request {
  const h = new Headers(headers);
  return new Request("https://example.com/api/test", { headers: h });
}

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("allows requests under the limit", () => {
    const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60_000 });
    const req = makeRequest({ "x-real-ip": "1.2.3.4" });

    for (let i = 0; i < 5; i++) {
      expect(limiter.check(req)).toBeNull();
    }
  });

  it("blocks requests over the limit", () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 });
    const req = makeRequest({ "x-real-ip": "1.2.3.4" });

    // First 3 should pass
    expect(limiter.check(req)).toBeNull();
    expect(limiter.check(req)).toBeNull();
    expect(limiter.check(req)).toBeNull();

    // 4th should be blocked
    const blocked = limiter.check(req);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it("returns 429 with Retry-After header", async () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    const req = makeRequest({ "x-real-ip": "5.6.7.8" });

    limiter.check(req); // first OK
    const blocked = limiter.check(req)!;

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeDefined();
    const body = await blocked.json();
    expect(body.error).toContain("Too many requests");
  });

  it("tracks different IPs independently", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });

    const req1 = makeRequest({ "x-real-ip": "1.1.1.1" });
    const req2 = makeRequest({ "x-real-ip": "2.2.2.2" });

    expect(limiter.check(req1)).toBeNull();
    expect(limiter.check(req2)).toBeNull();

    // Both exhausted
    expect(limiter.check(req1)).not.toBeNull();
    expect(limiter.check(req2)).not.toBeNull();
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();

    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 10_000 });
    const req = makeRequest({ "x-real-ip": "10.0.0.1" });

    expect(limiter.check(req)).toBeNull();
    expect(limiter.check(req)).not.toBeNull(); // blocked

    // Advance time past the window
    vi.advanceTimersByTime(11_000);

    expect(limiter.check(req)).toBeNull(); // should be allowed again

    vi.useRealTimers();
  });

  it("extracts IP from x-forwarded-for (last entry)", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });

    // x-forwarded-for: spoofed, real-proxy-ip
    const req = makeRequest({
      "x-forwarded-for": "spoofed-ip, 99.99.99.99",
    });

    expect(limiter.check(req)).toBeNull();
    expect(limiter.check(req)).not.toBeNull();

    // A different last IP should be treated as a different client
    const req2 = makeRequest({
      "x-forwarded-for": "spoofed-ip, 88.88.88.88",
    });
    expect(limiter.check(req2)).toBeNull();
  });

  it("prefers x-real-ip over x-forwarded-for", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });

    const req = makeRequest({
      "x-real-ip": "10.10.10.10",
      "x-forwarded-for": "20.20.20.20",
    });

    expect(limiter.check(req)).toBeNull();
    expect(limiter.check(req)).not.toBeNull();

    // Same x-forwarded-for but different x-real-ip — should be separate
    const req2 = makeRequest({
      "x-real-ip": "30.30.30.30",
      "x-forwarded-for": "20.20.20.20",
    });
    expect(limiter.check(req2)).toBeNull();
  });

  it("uses 'unknown' when no IP headers present", () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60_000 });

    const req = makeRequest(); // no IP headers
    expect(limiter.check(req)).toBeNull();
    expect(limiter.check(req)).toBeNull();
    expect(limiter.check(req)).not.toBeNull();
  });

  it("prunes expired entries during check", () => {
    vi.useFakeTimers();

    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 5_000 });
    const req1 = makeRequest({ "x-real-ip": "1.1.1.1" });
    const req2 = makeRequest({ "x-real-ip": "2.2.2.2" });

    limiter.check(req1);
    limiter.check(req2);

    // Both exhausted
    expect(limiter.check(req1)).not.toBeNull();
    expect(limiter.check(req2)).not.toBeNull();

    // Advance past window + prune interval (60s)
    vi.advanceTimersByTime(65_000);

    // After prune, entries should be cleaned and new requests allowed
    expect(limiter.check(req1)).toBeNull();
    expect(limiter.check(req2)).toBeNull();

    vi.useRealTimers();
  });
});
