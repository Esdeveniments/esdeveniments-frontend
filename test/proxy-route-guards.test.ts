import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  PUBLIC_API_PATTERNS,
  PUBLIC_API_EXACT_PATHS,
  EVENTS_PATTERN,
  ORIGIN_CHECK_EXEMPT,
  isOriginAllowed,
} from "../proxy";

// ── Helpers ──────────────────────────────────────────────────

function createRequest(
  url: string,
  method = "GET",
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers,
  });
}

const matchesPublicApi = (pathname: string) =>
  PUBLIC_API_PATTERNS.some((pattern) => pattern.test(pathname));

// ── isOriginAllowed ──────────────────────────────────────────

describe("isOriginAllowed", () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    }
  });

  it("returns true for matching Origin", () => {
    const req = createRequest("/api/sponsors/checkout", "POST", {
      origin: "https://www.esdeveniments.cat",
    });
    expect(isOriginAllowed(req)).toBe(true);
  });

  it("returns false for mismatched Origin", () => {
    const req = createRequest("/api/sponsors/checkout", "POST", {
      origin: "https://evil.com",
    });
    expect(isOriginAllowed(req)).toBe(false);
  });

  it("returns false when Origin header is missing", () => {
    const req = createRequest("/api/sponsors/checkout", "POST");
    expect(isOriginAllowed(req)).toBe(false);
  });

  it("returns false for invalid Origin URL", () => {
    const req = createRequest("/api/sponsors/checkout", "POST", {
      origin: "not-a-url",
    });
    expect(isOriginAllowed(req)).toBe(false);
  });

  it("allows Origin matching the request Host header (preview deployments)", () => {
    // Simulate a preview deployment where SITE_URL is production
    // but the actual request comes from a preview URL
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
    const req = createRequest("/api/sponsors/checkout", "POST", {
      origin: "https://preview-123.amplifyapp.com",
      host: "preview-123.amplifyapp.com",
    });
    expect(isOriginAllowed(req)).toBe(true);
  });

  it("rejects when NEXT_PUBLIC_SITE_URL is unset (falls back to localhost)", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const req = createRequest("/api/sponsors/checkout", "POST", {
      origin: "https://www.esdeveniments.cat",
    });
    // Without NEXT_PUBLIC_SITE_URL, siteHost falls back to "localhost:3000"
    // which won't match "www.esdeveniments.cat"
    expect(isOriginAllowed(req)).toBe(false);
  });
});

// ── GET-only restriction on pattern-based routes ─────────────

describe("pattern-based routes are GET-only", () => {
  it("pattern routes match only — middleware enforces GET-only via method check", () => {
    // The proxy middleware only allows pattern-based routes when method === "GET":
    // (request.method === "GET" && PUBLIC_API_PATTERNS.some(...))
    // Verify patterns match the pathname (method check is in middleware logic)
    expect(matchesPublicApi("/api/regions")).toBe(true);
    expect(matchesPublicApi("/api/categories")).toBe(true);
    expect(matchesPublicApi("/api/cities")).toBe(true);
    expect(matchesPublicApi("/api/places")).toBe(true);
    expect(matchesPublicApi("/api/news")).toBe(true);
  });

  it("events pattern matches expected paths", () => {
    expect(EVENTS_PATTERN.test("/api/events")).toBe(true);
    expect(EVENTS_PATTERN.test("/api/events/categorized")).toBe(true);
    expect(EVENTS_PATTERN.test("/api/events/some-slug")).toBe(true);
    expect(EVENTS_PATTERN.test("/api/events/foo/bar")).toBe(false);
  });
});

// ── Origin check exemptions ──────────────────────────────────

describe("ORIGIN_CHECK_EXEMPT routes bypass origin checking", () => {
  it("webhook is exempt from origin check", () => {
    expect(ORIGIN_CHECK_EXEMPT.has("/api/sponsors/webhook")).toBe(true);
  });

  it("revalidate is exempt from origin check", () => {
    expect(ORIGIN_CHECK_EXEMPT.has("/api/revalidate")).toBe(true);
  });

  it("health is exempt from origin check", () => {
    expect(ORIGIN_CHECK_EXEMPT.has("/api/health")).toBe(true);
  });

  it("sponsor checkout is NOT exempt (requires origin check)", () => {
    expect(ORIGIN_CHECK_EXEMPT.has("/api/sponsors/checkout")).toBe(false);
  });

  it("sponsor image-upload is NOT exempt", () => {
    expect(ORIGIN_CHECK_EXEMPT.has("/api/sponsors/image-upload")).toBe(false);
  });
});

// ── Public exact-path routes ─────────────────────────────────

describe("PUBLIC_API_EXACT_PATHS includes expected routes", () => {
  it("includes sponsor routes", () => {
    expect(PUBLIC_API_EXACT_PATHS).toContain("/api/sponsors/checkout");
    expect(PUBLIC_API_EXACT_PATHS).toContain("/api/sponsors/availability");
    expect(PUBLIC_API_EXACT_PATHS).toContain("/api/sponsors/image-upload");
    expect(PUBLIC_API_EXACT_PATHS).toContain("/api/sponsors/webhook");
  });

  it("includes other browser-initiated routes", () => {
    expect(PUBLIC_API_EXACT_PATHS).toContain("/api/favorites");
    expect(PUBLIC_API_EXACT_PATHS).toContain("/api/publica/image-upload");
  });

  it("does NOT include private routes", () => {
    expect(PUBLIC_API_EXACT_PATHS).not.toContain("/api/visits");
  });
});
