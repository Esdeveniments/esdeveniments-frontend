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
  const originalVercelUrl = process.env.VERCEL_URL;
  const originalVercelBranchUrl = process.env.VERCEL_BRANCH_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    }
    if (originalVercelUrl !== undefined) {
      process.env.VERCEL_URL = originalVercelUrl;
    } else {
      delete process.env.VERCEL_URL;
    }
    // VERCEL_BRANCH_URL is set inside the branch-alias test; restoring it
    // in afterEach (rather than at the end of the test body) keeps it from
    // leaking into later tests if that test fails early.
    if (originalVercelBranchUrl !== undefined) {
      process.env.VERCEL_BRANCH_URL = originalVercelBranchUrl;
    } else {
      delete process.env.VERCEL_BRANCH_URL;
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

  it("allows configured Vercel preview origins", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
    process.env.VERCEL_URL = "preview-123.vercel.app";
    const req = createRequest("/api/sponsors/checkout", "POST", {
      origin: "https://preview-123.vercel.app",
      host: "attacker.example.com",
    });
    expect(isOriginAllowed(req)).toBe(true);
  });

  it("allows the Vercel branch-alias origin (VERCEL_BRANCH_URL)", () => {
    // VERCEL_URL is the per-deployment hash URL, but the URL users click
    // from the PR preview comment is the branch-alias VERCEL_BRANCH_URL.
    // Without allowing it, every same-origin POST 403s on previews.
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
    process.env.VERCEL_URL = "esdeveniments-frontend-abc123.vercel.app";
    process.env.VERCEL_BRANCH_URL =
      "esdeveniments-frontend-git-feat-user-favor-9fe4b8.vercel.app";
    const req = createRequest("/api/favorites", "POST", {
      origin:
        "https://esdeveniments-frontend-git-feat-user-favor-9fe4b8.vercel.app",
    });
    expect(isOriginAllowed(req)).toBe(true);
  });

  it("rejects host-like localhost origins in development", () => {
    const req = createRequest("/api/sponsors/checkout", "POST", {
      origin: "http://localhost.evil.test:3000",
    });
    expect(isOriginAllowed(req)).toBe(false);
  });

  it("does not trust attacker-controlled Host for origin checks", () => {
    const req = createRequest("/api/sponsors/checkout", "POST", {
      origin: "https://evil.com",
      host: "evil.com",
    });
    expect(isOriginAllowed(req)).toBe(false);
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

  it("allows same-origin via x-forwarded-host on a Coolify pr-* preview (not in the allowlist)", () => {
    // The preview serves pr-375.esdeveniments.cat but NEXT_PUBLIC_SITE_URL is
    // www and no VERCEL_* vars exist, so the static allowlist misses it. The
    // proxy sets x-forwarded-host to the public host → same-origin POST passes.
    const req = createRequest("/api/favorites", "POST", {
      origin: "https://pr-375.esdeveniments.cat",
      "x-forwarded-host": "pr-375.esdeveniments.cat",
    });
    expect(isOriginAllowed(req)).toBe(true);
  });

  it("allows same-origin via x-forwarded-host on staging (regardless of baked NEXT_PUBLIC_SITE_URL)", () => {
    const req = createRequest("/api/favorites", "POST", {
      origin: "https://staging.esdeveniments.cat",
      "x-forwarded-host": "staging.esdeveniments.cat",
    });
    expect(isOriginAllowed(req)).toBe(true);
  });

  it("takes the first value of a comma-listed x-forwarded-host", () => {
    const req = createRequest("/api/favorites", "POST", {
      origin: "https://pr-9.esdeveniments.cat",
      "x-forwarded-host": "pr-9.esdeveniments.cat, internal",
    });
    expect(isOriginAllowed(req)).toBe(true);
  });

  it("rejects a cross-site Origin even when x-forwarded-host is our real host", () => {
    // The CSRF case: the proxy reports our host, the attacker's page reports
    // its own Origin → mismatch → blocked.
    const req = createRequest("/api/favorites", "POST", {
      origin: "https://evil.com",
      "x-forwarded-host": "www.esdeveniments.cat",
    });
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
