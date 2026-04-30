import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import proxy from "../proxy";
import { generateHmac } from "../utils/hmac";

const originalEnv = { ...process.env };

// Only mock randomUUID; keep native crypto.subtle so real HMAC ops work
const nativeSubtle = globalThis.crypto.subtle;
vi.stubGlobal("crypto", {
  subtle: nativeSubtle,
  randomUUID: vi.fn().mockReturnValue("test-uuid"),
});

vi.mock("next/server", () => {
  // Use a function constructor wrapped with vi.fn() for Vitest 4 compatibility
  const MockNextResponseFn = vi.fn(function (
    body?: unknown,
    options?: { status?: number },
  ) {
    return {
      status: options?.status || 200,
      headers: new Headers(),
      cookies: {
        set: vi.fn(),
      },
      text: () => Promise.resolve(body || ""),
    };
  });

  // Create a properly typed mock object with static methods
  const MockNextResponse = Object.assign(MockNextResponseFn, {
    next: vi.fn((options?: { request?: { headers?: Headers } }) => {
      const response = MockNextResponseFn("", {});
      // Store the request for test assertions
      if (options?.request) {
        (response as any).request = options.request;
      }
      return response;
    }),
    redirect: vi.fn((_: unknown, status?: number) =>
      MockNextResponseFn("redirect", { status }),
    ),
    rewrite: vi.fn((_: unknown, options?: { request?: { headers?: Headers } }) => {
      const response = MockNextResponseFn("", {});
      if (options?.request) {
        (response as any).request = options.request;
      }
      return response;
    }),
    json: vi.fn((data: unknown, options?: { status?: number }) =>
      MockNextResponseFn(JSON.stringify(data), options),
    ),
  }) as any;

  return {
    NextRequest: vi.fn(),
    NextResponse: MockNextResponse,
  };
});

// No need for globalThis mock, vi.mock handles it

vi.mock("../utils/api-helpers", () => ({
  getApiOrigin: vi.fn().mockReturnValue("https://api.example.com"),
}));

describe("proxy", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.HMAC_SECRET = "test-secret";

    // Ensure preview/CSP env vars are unset so CSP tests reflect production behavior
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_CSP_REPORT_ONLY;

    // Reset mocks
    vi.restoreAllMocks();
    vi.stubGlobal("crypto", {
      subtle: nativeSubtle,
      randomUUID: vi.fn().mockReturnValue("test-uuid"),
    });

    // Reset NextResponse.next, redirect, and rewrite mocks
    (NextResponse.next as any).mockReset();
    (NextResponse.redirect as any).mockReset();
    (NextResponse.rewrite as any).mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  /** Create a mock nextUrl that supports clone() for proxy rewriting */
  function mockNextUrl(overrides: { pathname: string; search?: string; searchParams?: URLSearchParams }) {
    const search = overrides.search ?? "";
    const searchParams = overrides.searchParams ?? new URLSearchParams(search);
    const obj = { pathname: overrides.pathname, search, searchParams, clone() { return { ...obj, searchParams: new URLSearchParams(search) }; } };
    return obj;
  }

  describe("non-API routes", () => {
    it("rewrites non-API routes to add default locale prefix", async () => {
      const mockRequest = {
        nextUrl: mockNextUrl({
          pathname: "/home",
          search: "",
          searchParams: new URLSearchParams(),
        }),
        headers: new Headers(),
        clone: vi.fn().mockReturnThis(),
        method: "GET",
      } as unknown as NextRequest;

      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(mockRequest);

      // With [locale] segment, default-locale paths are rewritten to include /ca/
      expect(NextResponse.rewrite).toHaveBeenCalledTimes(1);
      const [rewriteUrl] = (NextResponse.rewrite as Mock).mock.calls[0];
      expect(rewriteUrl.pathname).toBe("/ca/home");
      expect(result).toBeDefined();
    });

    it("sets short CDN cache headers for public pages to avoid day-stale HTML", async () => {
      const mockRequest = {
        nextUrl: mockNextUrl({
          pathname: "/catalunya",
          search: "",
          searchParams: new URLSearchParams(),
        }),
        headers: new Headers({ accept: "text/html" }),
        method: "GET",
      } as unknown as NextRequest;

      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(mockRequest);

      expect(result.headers.get("Cache-Control")).toBe(
        "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
      );
    });

    it("handles /sw.js route with cache headers", async () => {
      const mockRequest = {
        nextUrl: mockNextUrl({
          pathname: "/sw.js",
          search: "",
          searchParams: new URLSearchParams(),
        }),
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      const mockResponse = { headers: new Headers() };
      (NextResponse.next as Mock).mockReturnValue(mockResponse);

      const result = await proxy(mockRequest);

      // We intentionally avoid `no-store` here so the bfcache (back/forward cache)
      // can keep this navigation eligible. `no-cache, max-age=0, must-revalidate`
      // forces revalidation without blocking bfcache. See proxy.ts for rationale.
      expect(result.headers.get("Cache-Control")).toBe(
        "no-cache, max-age=0, must-revalidate",
      );
      expect(result.headers.get("Service-Worker-Allowed")).toBe("/");
    });

    it("redirects legacy /tots/ routes", async () => {
      const mockRequest = {
        nextUrl: mockNextUrl({
          pathname: "/barcelona/tots/events",
          search: "?search=rock",
          searchParams: new URLSearchParams("?search=rock"),
        }),
        url: "https://example.com/barcelona/tots/events?search=rock",
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL(
          "/barcelona/events?search=rock",
          "https://example.com/barcelona/tots/events?search=rock",
        ),
        301,
      );
    });

    it("redirects query params to canonical path (/barcelona?category=teatre&date=tots → /barcelona/teatre)", async () => {
      const mockRequest = {
        nextUrl: mockNextUrl({
          pathname: "/barcelona",
          search: "?category=teatre&date=tots",
          searchParams: new URLSearchParams("?category=teatre&date=tots"),
        }),
        url: "https://example.com/barcelona?category=teatre&date=tots",
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL(
          "/barcelona/teatre",
          "https://example.com/barcelona?category=teatre&date=tots",
        ),
        301,
      );
    });

    it("preserves other query params on redirect (e.g., search)", async () => {
      const mockRequest = {
        nextUrl: mockNextUrl({
          pathname: "/barcelona",
          search: "?category=teatre&date=tots&search=castellers",
          searchParams: new URLSearchParams(
            "?category=teatre&date=tots&search=castellers",
          ),
        }),
        url: "https://example.com/barcelona?category=teatre&date=tots&search=castellers",
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL(
          "/barcelona/teatre?search=castellers",
          "https://example.com/barcelona?category=teatre&date=tots&search=castellers",
        ),
        301,
      );
    });

    it("does not redirect non-place routes with query params", async () => {
      const mockRequest = {
        nextUrl: mockNextUrl({
          pathname: "/noticies",
          search: "?category=teatre&date=avui",
          searchParams: new URLSearchParams("?category=teatre&date=avui"),
        }),
        url: "https://example.com/noticies?category=teatre&date=avui",
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      await proxy(mockRequest);

      // Should rewrite (add default locale) rather than redirect
      expect(NextResponse.rewrite).toHaveBeenCalled();
    });

    it("removes invalid date query by redirecting to /place (no extra segment)", async () => {
      const mockRequest = {
        nextUrl: mockNextUrl({
          pathname: "/barcelona",
          search: "?date=invalid",
          searchParams: new URLSearchParams("?date=invalid"),
        }),
        url: "https://example.com/barcelona?date=invalid",
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL("/barcelona", "https://example.com/barcelona?date=invalid"),
        301,
      );
    });
  });

  describe("X-Robots-Tag (production-host allowlist)", () => {
    /** Build a minimal page request hitting a given Host header. */
    function buildPageRequest(host: string): NextRequest {
      return {
        nextUrl: mockNextUrl({
          pathname: "/catalunya",
          search: "",
          searchParams: new URLSearchParams(),
        }),
        headers: new Headers({ host, accept: "text/html" }),
        method: "GET",
      } as unknown as NextRequest;
    }

    it("does NOT set X-Robots-Tag on production host (www)", async () => {
      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(buildPageRequest("www.esdeveniments.cat"));

      expect(result.headers.get("X-Robots-Tag")).toBeNull();
    });

    it("does NOT set X-Robots-Tag on production host (apex)", async () => {
      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(buildPageRequest("esdeveniments.cat"));

      expect(result.headers.get("X-Robots-Tag")).toBeNull();
    });

    it("sets noindex,nofollow on staging host", async () => {
      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(
        buildPageRequest("staging.esdeveniments.cat"),
      );

      expect(result.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    });

    it("sets noindex,nofollow on PR-preview host with pr- template", async () => {
      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(buildPageRequest("pr-42.esdeveniments.cat"));

      expect(result.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    });

    it("sets noindex,nofollow on PR-preview host with default Coolify template", async () => {
      // Default Coolify template is `{{pr_id}}.{{domain}}` → no `pr-` prefix.
      // Substring-based detection would silently miss this; allowlist catches it.
      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(buildPageRequest("42.esdeveniments.cat"));

      expect(result.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    });

    it("sets noindex,nofollow when Host header is missing (default-deny)", async () => {
      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const request = {
        nextUrl: mockNextUrl({
          pathname: "/catalunya",
          search: "",
          searchParams: new URLSearchParams(),
        }),
        headers: new Headers({ accept: "text/html" }),
        method: "GET",
      } as unknown as NextRequest;

      const result = await proxy(request);

      expect(result.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    });

    it("sets noindex,nofollow on /compartir-tiktok even on production host", async () => {
      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const request = {
        nextUrl: mockNextUrl({
          pathname: "/compartir-tiktok",
          search: "",
          searchParams: new URLSearchParams(),
        }),
        headers: new Headers({
          host: "www.esdeveniments.cat",
          accept: "text/html",
        }),
        method: "GET",
      } as unknown as NextRequest;

      const result = await proxy(request);

      expect(result.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    });
  });

  describe("API routes", () => {
    it("returns 401 when x-hmac header is missing", async () => {
      const mockRequest = {
        nextUrl: { pathname: "/api/test", search: "" },
        headers: new Headers({ "x-timestamp": "1234567890" }),
        clone: vi.fn().mockReturnThis(),
        text: vi.fn().mockResolvedValue(""),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 },
      );
    });

    it("returns 401 when x-timestamp header is missing", async () => {
      const mockRequest = {
        nextUrl: { pathname: "/api/test", search: "" },
        headers: new Headers({ "x-hmac": "some-hmac" }),
        clone: vi.fn().mockReturnThis(),
        text: vi.fn().mockResolvedValue(""),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 },
      );
    });

    it("returns 408 for invalid timestamp format", async () => {
      const mockRequest = {
        nextUrl: { pathname: "/api/test", search: "" },
        headers: new Headers({
          "x-timestamp": "invalid",
          "x-hmac": "some-hmac",
        }),
        clone: vi.fn().mockReturnThis(),
        text: vi.fn().mockResolvedValue(""),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 },
      );
    });

    it("returns 408 for future timestamp", async () => {
      const futureTimestamp = Date.now() + 120000; // 2 minutes in future
      const mockRequest = {
        nextUrl: { pathname: "/api/test", search: "" },
        headers: new Headers({
          "x-timestamp": futureTimestamp.toString(),
          "x-hmac": "some-hmac",
        }),
        clone: vi.fn().mockReturnThis(),
        text: vi.fn().mockResolvedValue(""),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 },
      );
    });

    it("returns 401 for expired timestamp", async () => {
      const expiredTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago
      const mockRequest = {
        nextUrl: { pathname: "/api/test", search: "" },
        headers: new Headers({
          "x-timestamp": expiredTimestamp.toString(),
          "x-hmac": "some-hmac",
        }),
        clone: vi.fn().mockReturnThis(),
        text: vi.fn().mockResolvedValue(""),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 },
      );
    });

    it("returns 401 for invalid HMAC", async () => {
      const timestamp = Date.now();
      const mockRequest = {
        nextUrl: { pathname: "/api/test", search: "" },
        headers: new Headers({
          "x-timestamp": timestamp.toString(),
          "x-hmac": "invalid-hmac",
        }),
        clone: vi.fn().mockReturnThis(),
        text: vi.fn().mockResolvedValue("request body"),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Unauthorized" },
        { status: 401 },
      );
    });

    it("passes through valid requests", async () => {
      const timestamp = Date.now();
      const body = "request body";
      const pathAndQuery = "/api/test";

      // Generate valid HMAC
      const validHmac = await generateHmac(
        body,
        timestamp,
        pathAndQuery,
        "GET",
      );

      const mockRequest = {
        nextUrl: { pathname: "/api/test", search: "" },
        headers: new Headers({
          "x-timestamp": timestamp.toString(),
          "x-hmac": validHmac,
        }),
        clone: vi.fn().mockReturnThis(),
        text: vi.fn().mockResolvedValue(body),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.next).toHaveBeenCalled();
    });

    it("includes query parameters in signature verification", async () => {
      const timestamp = Date.now();
      const body = "request body";
      const pathAndQuery = "/api/test?param=value&other=123";

      const validHmac = await generateHmac(
        body,
        timestamp,
        pathAndQuery,
        "GET",
      );

      const mockRequest = {
        nextUrl: { pathname: "/api/test", search: "?param=value&other=123" },
        headers: new Headers({
          "x-timestamp": timestamp.toString(),
          "x-hmac": validHmac,
        }),
        clone: vi.fn().mockReturnThis(),
        text: vi.fn().mockResolvedValue(body),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.next).toHaveBeenCalled();
    });

    it("skips body reading for multipart/form-data", async () => {
      const timestamp = Date.now();
      const pathAndQuery = "/api/upload";

      const validHmac = await generateHmac("", timestamp, pathAndQuery, "GET");

      const mockRequest = {
        nextUrl: { pathname: "/api/upload", search: "" },
        headers: new Headers({
          "x-timestamp": timestamp.toString(),
          "x-hmac": validHmac,
          "content-type": "multipart/form-data; boundary=boundary",
        }),
        clone: vi.fn().mockReturnThis(),
        text: vi.fn(), // Should not be called
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(mockRequest.clone().text).not.toHaveBeenCalled();
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it("handles body reading errors gracefully", async () => {
      const timestamp = Date.now();
      const validHmac = await generateHmac("", timestamp, "/api/test", "GET");
      const mockRequest = {
        nextUrl: { pathname: "/api/test", search: "" },
        headers: new Headers({
          "x-timestamp": timestamp.toString(),
          "x-hmac": validHmac,
        }),
        clone: vi.fn().mockReturnThis(),
        text: vi.fn().mockRejectedValue(new Error("Read error")),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse).toHaveBeenCalledWith(
        "Bad Request: Unable to read request body",
        { status: 400 },
      );
    });

    it("returns 500 when HMAC_SECRET is not configured", async () => {
      process.env.HMAC_SECRET = undefined;

      const mockRequest = {
        nextUrl: { pathname: "/api/test", search: "" },
        headers: new Headers({
          "x-timestamp": "1234567890",
          "x-hmac": "some-hmac",
        }),
        clone: vi.fn().mockReturnThis(),
        text: vi.fn().mockResolvedValue(""),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse).toHaveBeenCalledWith("Internal Server Error", {
        status: 500,
      });
    });

    it("verifies URLSearchParams body signature correctly", async () => {
      const timestamp = Date.now();
      const params = new URLSearchParams();
      params.append("key1", "value1");
      params.append("key2", "value2");
      const bodyString = params.toString(); // "key1=value1&key2=value2"
      const pathAndQuery = "/api/test";

      const validHmac = await generateHmac(
        bodyString,
        timestamp,
        pathAndQuery,
        "POST",
      );

      const mockRequest = {
        nextUrl: { pathname: "/api/test", search: "" },
        headers: new Headers({
          "x-timestamp": timestamp.toString(),
          "x-hmac": validHmac,
          "content-type": "application/x-www-form-urlencoded",
        }),
        clone: vi.fn().mockReturnThis(),
        text: vi.fn().mockResolvedValue(bodyString),
        method: "POST",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.next).toHaveBeenCalled();
    });

    it("injects x-visitor-id and sets cookie for /api/sponsors/checkout POST when missing", async () => {
      // This test verifies the fix for the idempotency race condition:
      // On first visit, middleware must forward visitor_id via header so route handler
      // can use it in the same request cycle (before browser receives cookie)
      const cookieCalls: Array<{ name: string; value: string; options: any }> =
        [];
      const mockResponse = {
        status: 200,
        headers: new Headers(),
        cookies: {
          set: (name: string, value: string, options: any) => {
            cookieCalls.push({ name, value, options });
          },
        },
        text: () => Promise.resolve(""),
      } as unknown as NextResponse;
      (NextResponse.next as unknown as any).mockImplementation(
        (options?: { request?: { headers?: Headers } }) => {
          if (options?.request) {
            (mockResponse as any).request = options.request;
          }
          return mockResponse;
        },
      );

      // No visitor cookie present (first visit)
      const checkoutHeaders = new Headers();
      checkoutHeaders.set("origin", "http://localhost:3000");
      const mockRequest = {
        nextUrl: { pathname: "/api/sponsors/checkout", search: "" },
        headers: checkoutHeaders,
        cookies: { get: vi.fn().mockReturnValue(undefined) },
        method: "POST",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      // x-visitor-id must be injected so checkout route can use it for idempotency
      const forwardedVisitorId = (mockResponse as any).request?.headers.get(
        "x-visitor-id",
      );
      expect(forwardedVisitorId).toBeDefined();
      expect(forwardedVisitorId).toBe("testuuid");

      // Cookie should also be set for subsequent requests
      expect(cookieCalls.length).toBe(1);
      expect(cookieCalls[0].name).toBe("visitor_id");
      expect(cookieCalls[0].value).toBe("testuuid");
    });

    it("uses existing visitor_id cookie for /api/sponsors/checkout POST", async () => {
      const cookieCalls: Array<{ name: string; value: string; options: any }> =
        [];
      const mockResponse = {
        status: 200,
        headers: new Headers(),
        cookies: {
          set: (name: string, value: string, options: any) => {
            cookieCalls.push({ name, value, options });
          },
        },
        text: () => Promise.resolve(""),
      } as unknown as NextResponse;
      (NextResponse.next as unknown as any).mockImplementation(
        (options?: { request?: { headers?: Headers } }) => {
          if (options?.request) {
            (mockResponse as any).request = options.request;
          }
          return mockResponse;
        },
      );

      const existingVisitorId = "existing-visitor-456";
      const checkoutHeaders2 = new Headers();
      checkoutHeaders2.set("origin", "http://localhost:3000");
      const mockRequest = {
        nextUrl: { pathname: "/api/sponsors/checkout", search: "" },
        headers: checkoutHeaders2,
        cookies: {
          get: vi.fn().mockReturnValue({ value: existingVisitorId }),
        },
        method: "POST",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      // x-visitor-id should use existing cookie value
      const forwardedVisitorId = (mockResponse as any).request?.headers.get(
        "x-visitor-id",
      );
      expect(forwardedVisitorId).toBe(existingVisitorId);

      // Cookie should NOT be set again
      expect(cookieCalls.length).toBe(0);
    });
  });

  describe("CSP and security headers", () => {
    it("adds security headers to non-API routes", async () => {
      const mockRequest = {
        nextUrl: mockNextUrl({
          pathname: "/home",
          search: "",
          searchParams: new URLSearchParams(),
        }),
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      const mockResponse = {
        headers: new Headers(),
      };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      await proxy(mockRequest);

      // In test env (non-preview), CSP must be enforced, not report-only
      expect(
        mockResponse.headers.get("Content-Security-Policy"),
      ).toBeDefined();
      expect(
        mockResponse.headers.get("Content-Security-Policy-Report-Only"),
      ).toBeNull();
      expect(
        mockResponse.headers.get("Strict-Transport-Security"),
      ).toBeDefined();
      expect(mockResponse.headers.get("X-Content-Type-Options")).toBe(
        "nosniff",
      );
      expect(mockResponse.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
      expect(mockResponse.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin",
      );
      expect(mockResponse.headers.get("Permissions-Policy")).toBe(
        "camera=(), microphone=(), geolocation=(self)",
      );
    });

    it("CSP includes unsafe-inline for ISR compatibility", async () => {
      const mockRequest = {
        nextUrl: mockNextUrl({
          pathname: "/home",
          search: "",
          searchParams: new URLSearchParams(),
        }),
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      const mockResponse = {
        headers: new Headers(),
      };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      await proxy(mockRequest);

      const csp = mockResponse.headers.get("Content-Security-Policy") || "";
      expect(csp).toContain("'unsafe-inline'");
      // Should not contain strict-dynamic or nonce (relaxed CSP for ISR)
      expect(csp).not.toContain("'strict-dynamic'");
    });

    it("sets pathname in request headers", async () => {
      const mockRequest = {
        nextUrl: mockNextUrl({
          pathname: "/home",
          search: "",
          searchParams: new URLSearchParams(),
        }),
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      const mockResponse = {
        headers: new Headers(),
      };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      await proxy(mockRequest);

      // With [locale] segment, default-locale paths go through rewrite
      const rewriteCall = (NextResponse.rewrite as Mock).mock.calls[0];
      const rewriteOptions = rewriteCall[1];
      expect(rewriteOptions.request.headers.get("x-pathname")).toBe("/home");
      // No nonce header with relaxed CSP
      expect(rewriteOptions.request.headers.get("x-nonce")).toBeNull();
    });
  });
});
