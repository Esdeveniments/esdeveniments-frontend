import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import proxy from "../proxy";
import { generateHmac } from "../utils/hmac";

const originalEnv = { ...process.env };

// Mock crypto globally
vi.stubGlobal("crypto", {
  subtle: {
    importKey: vi.fn(),
    sign: vi.fn(),
    verify: vi.fn(),
  },
  randomUUID: vi.fn().mockReturnValue("test-uuid"),
});

vi.mock("next/server", () => {
  // Use a function constructor wrapped with vi.fn() for Vitest 4 compatibility
  const MockNextResponseFn = vi.fn(function (body?: unknown, options?: { status?: number }) {
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
      MockNextResponseFn("redirect", { status })
    ),
    json: vi.fn((data: unknown, options?: { status?: number }) =>
      MockNextResponseFn(JSON.stringify(data), options)
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

    // Reset mocks
    vi.restoreAllMocks();
    vi.stubGlobal("crypto", {
      subtle: {
        importKey: vi.fn(),
        sign: vi.fn(),
        verify: vi.fn(),
      },
      randomUUID: vi.fn().mockReturnValue("test-uuid"),
    });

    // Reset NextResponse.next and redirect mocks
    (NextResponse.next as any).mockReset();
    (NextResponse.redirect as any).mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("non-API routes", () => {
    it("passes through non-API routes", async () => {
      const mockRequest = {
        nextUrl: {
          pathname: "/home",
          search: "",
          searchParams: new URLSearchParams(),
        },
        headers: new Headers(),
        clone: vi.fn().mockReturnThis(),
        method: "GET",
      } as unknown as NextRequest;

      const result = await proxy(mockRequest);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("handles /sw.js route with cache headers", async () => {
      const mockRequest = {
        nextUrl: {
          pathname: "/sw.js",
          search: "",
          searchParams: new URLSearchParams(),
        },
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
        "no-cache, max-age=0, must-revalidate"
      );
      expect(result.headers.get("Service-Worker-Allowed")).toBe("/");
    });

    it("redirects legacy /tots/ routes", async () => {
      const mockRequest = {
        nextUrl: {
          pathname: "/barcelona/tots/events",
          search: "?search=rock",
          searchParams: new URLSearchParams("?search=rock"),
        },
        url: "https://example.com/barcelona/tots/events?search=rock",
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL(
          "/barcelona/events?search=rock",
          "https://example.com/barcelona/tots/events?search=rock"
        ),
        301
      );
    });

    it("redirects query params to canonical path (/barcelona?category=teatre&date=tots → /barcelona/teatre)", async () => {
      const mockRequest = {
        nextUrl: {
          pathname: "/barcelona",
          search: "?category=teatre&date=tots",
          searchParams: new URLSearchParams("?category=teatre&date=tots"),
        },
        url: "https://example.com/barcelona?category=teatre&date=tots",
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL(
          "/barcelona/teatre",
          "https://example.com/barcelona?category=teatre&date=tots"
        ),
        301
      );
    });

    it("preserves other query params on redirect (e.g., search)", async () => {
      const mockRequest = {
        nextUrl: {
          pathname: "/barcelona",
          search: "?category=teatre&date=tots&search=castellers",
          searchParams: new URLSearchParams(
            "?category=teatre&date=tots&search=castellers"
          ),
        },
        url: "https://example.com/barcelona?category=teatre&date=tots&search=castellers",
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL(
          "/barcelona/teatre?search=castellers",
          "https://example.com/barcelona?category=teatre&date=tots&search=castellers"
        ),
        301
      );
    });

    it("does not redirect non-place routes with query params", async () => {
      const mockRequest = {
        nextUrl: {
          pathname: "/noticies",
          search: "?category=teatre&date=avui",
          searchParams: new URLSearchParams("?category=teatre&date=avui"),
        },
        url: "https://example.com/noticies?category=teatre&date=avui",
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.next).toHaveBeenCalled();
    });

    it("removes invalid date query by redirecting to /place (no extra segment)", async () => {
      const mockRequest = {
        nextUrl: {
          pathname: "/barcelona",
          search: "?date=invalid",
          searchParams: new URLSearchParams("?date=invalid"),
        },
        url: "https://example.com/barcelona?date=invalid",
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL("/barcelona", "https://example.com/barcelona?date=invalid"),
        301
      );
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

      expect(NextResponse).toHaveBeenCalledWith("Unauthorized", {
        status: 401,
      });
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

      expect(NextResponse).toHaveBeenCalledWith("Unauthorized", {
        status: 401,
      });
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

      expect(NextResponse).toHaveBeenCalledWith("Unauthorized", {
        status: 401,
      });
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

      expect(NextResponse).toHaveBeenCalledWith("Unauthorized", {
        status: 401,
      });
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

      expect(NextResponse).toHaveBeenCalledWith("Unauthorized", {
        status: 401,
      });
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

      // Mock verifyHmac to return false
      (globalThis.crypto.subtle.verify as Mock).mockResolvedValue(false);

      await proxy(mockRequest);

      expect(NextResponse).toHaveBeenCalledWith("Unauthorized", {
        status: 401,
      });
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
        "GET"
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

      // Mock verifyHmac to return true
      (globalThis.crypto.subtle.verify as Mock).mockResolvedValue(true);

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
        "GET"
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

      (globalThis.crypto.subtle.verify as Mock).mockResolvedValue(true);

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

      (globalThis.crypto.subtle.verify as Mock).mockResolvedValue(true);

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

      (globalThis.crypto.subtle.verify as Mock).mockResolvedValue(true);

      await proxy(mockRequest);

      expect(NextResponse).toHaveBeenCalledWith(
        "Bad Request: Unable to read request body",
        { status: 400 }
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
        "POST"
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

      (globalThis.crypto.subtle.verify as Mock).mockResolvedValue(true);

      await proxy(mockRequest);

      expect(NextResponse.next).toHaveBeenCalled();
    });

    it("injects x-visitor-id and sets cookie for /api/visits POST when missing", async () => {
      // Prepare a NextResponse.next that captures cookies.set calls
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
      // Use mockImplementation instead of mockReturnValue to capture the request parameter
      (NextResponse.next as unknown as any).mockImplementation((options?: { request?: { headers?: Headers } }) => {
        // Store the request for test assertions
        if (options?.request) {
          (mockResponse as any).request = options.request;
        }
        return mockResponse;
      });

      // No visitor cookie present
      const mockRequest = {
        nextUrl: { pathname: "/api/visits", search: "" },
        headers: new Headers(),
        cookies: { get: vi.fn().mockReturnValue(undefined) },
        method: "POST",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      // Ensure x-visitor-id was injected into the forwarded request headers
      // The request is stored on the mockResponse object
      const forwardedVisitorId = (mockResponse as any).request?.headers.get("x-visitor-id");
      expect(forwardedVisitorId).toBeDefined();
      // crypto.randomUUID() is mocked to 'test-uuid' => header should be without dashes
      expect(forwardedVisitorId).toBe("testuuid");

      // Cookie should be set when it was missing
      expect(cookieCalls.length).toBe(1);
      expect(cookieCalls[0].name).toBe("visitor_id");
      expect(cookieCalls[0].value).toBe("testuuid");
      expect(cookieCalls[0].options.path).toBe("/");
    });

    it("uses existing visitor_id cookie and does not set new cookie for /api/visits POST", async () => {
      // Prepare a NextResponse.next that captures cookies.set calls
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
      // Use mockImplementation instead of mockReturnValue to capture the request parameter
      (NextResponse.next as unknown as any).mockImplementation((options?: { request?: { headers?: Headers } }) => {
        // Store the request for test assertions
        if (options?.request) {
          (mockResponse as any).request = options.request;
        }
        return mockResponse;
      });

      // Existing visitor cookie present
      const existingVisitorId = "existing-visitor-123";
      const mockRequest = {
        nextUrl: { pathname: "/api/visits", search: "" },
        headers: new Headers(),
        cookies: {
          get: vi.fn().mockReturnValue({ value: existingVisitorId }),
        },
        method: "POST",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      // Ensure x-visitor-id header uses the existing cookie value
      // The request is stored on the mockResponse object
      const forwardedVisitorId = (mockResponse as any).request?.headers.get("x-visitor-id");
      expect(forwardedVisitorId).toBe(existingVisitorId);

      // Cookie should NOT be set when it already exists
      expect(cookieCalls.length).toBe(0);
    });
  });

  describe("CSP and security headers", () => {
    it("adds security headers to non-API routes", async () => {
      const mockRequest = {
        nextUrl: {
          pathname: "/home",
          search: "",
          searchParams: new URLSearchParams(),
        },
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      const mockResponse = {
        headers: new Headers(),
      };
      (NextResponse.next as Mock).mockReturnValue(mockResponse);

      await proxy(mockRequest);

      expect(
        mockResponse.headers.get("Content-Security-Policy") ||
          mockResponse.headers.get("Content-Security-Policy-Report-Only")
      ).toBeDefined();
      expect(
        mockResponse.headers.get("Strict-Transport-Security")
      ).toBeDefined();
      expect(mockResponse.headers.get("X-Content-Type-Options")).toBe(
        "nosniff"
      );
      expect(mockResponse.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
      expect(mockResponse.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin"
      );
      expect(mockResponse.headers.get("Permissions-Policy")).toBe(
        "camera=(), microphone=(), geolocation=(self)"
      );
    });

    it("CSP includes unsafe-inline for ISR compatibility", async () => {
      const mockRequest = {
        nextUrl: {
          pathname: "/home",
          search: "",
          searchParams: new URLSearchParams(),
        },
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      const mockResponse = {
        headers: new Headers(),
      };
      (NextResponse.next as Mock).mockReturnValue(mockResponse);

      await proxy(mockRequest);

      const csp =
        mockResponse.headers.get("Content-Security-Policy") ||
        mockResponse.headers.get("Content-Security-Policy-Report-Only") ||
        "";
      expect(csp).toContain("'unsafe-inline'");
      // Should not contain strict-dynamic or nonce (relaxed CSP for ISR)
      expect(csp).not.toContain("'strict-dynamic'");
    });

    it("sets pathname in request headers", async () => {
      const mockRequest = {
        nextUrl: {
          pathname: "/home",
          search: "",
          searchParams: new URLSearchParams(),
        },
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      const mockResponse = {
        headers: new Headers(),
      };
      (NextResponse.next as Mock).mockReturnValue(mockResponse);

      await proxy(mockRequest);

      const nextResponseCall = (NextResponse.next as Mock).mock.calls[0][0];
      expect(nextResponseCall.request.headers.get("x-pathname")).toBe("/home");
      // No nonce header with relaxed CSP
      expect(nextResponseCall.request.headers.get("x-nonce")).toBeNull();
    });
  });
});
