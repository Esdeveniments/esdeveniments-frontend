import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { middleware } from "../middleware";
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
  const MockNextResponse = vi.fn().mockImplementation((body, options) => {
    return {
      status: options?.status || 200,
      headers: new Headers(),
      text: () => Promise.resolve(body || ""),
    };
  });

  Object.assign(MockNextResponse, {
    next: vi.fn(() => MockNextResponse()),
    redirect: vi.fn((_, status) => MockNextResponse("redirect", { status })),
    json: vi.fn((data, options) =>
      MockNextResponse(JSON.stringify(data), options)
    ),
  });

  return {
    NextRequest: vi.fn(),
    NextResponse: MockNextResponse,
  };
});

// No need for globalThis mock, vi.mock handles it

vi.mock("../utils/api-helpers", () => ({
  getApiOrigin: vi.fn().mockReturnValue("https://api.example.com"),
}));

describe("middleware", () => {
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

    vi.mocked(NextResponse).next.mockReturnValue({
      status: 200,
      headers: new Headers(),
      text: () => Promise.resolve(""),
    } as unknown as NextResponse);
    vi.mocked(NextResponse).redirect.mockReturnValue({
      status: 301,
      headers: new Headers(),
      text: () => Promise.resolve("redirect"),
    } as unknown as NextResponse);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("non-API routes", () => {
    it("passes through non-API routes", async () => {
      const mockRequest = {
        nextUrl: { pathname: "/home", search: "" },
        headers: new Headers(),
        clone: vi.fn().mockReturnThis(),
        method: "GET",
      } as unknown as NextRequest;

      const result = await middleware(mockRequest);

      expect(NextResponse.next).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("handles /sw.js route with cache headers", async () => {
      const mockRequest = {
        nextUrl: { pathname: "/sw.js", search: "" },
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      const mockResponse = { headers: new Headers() };
      (NextResponse.next as Mock).mockReturnValue(mockResponse);

      const result = await middleware(mockRequest);

      expect(result.headers.get("Cache-Control")).toBe(
        "no-cache, no-store, must-revalidate"
      );
      expect(result.headers.get("Service-Worker-Allowed")).toBe("/");
    });

    it("redirects legacy /tots/ routes", async () => {
      const mockRequest = {
        nextUrl: {
          pathname: "/barcelona/tots/events",
          search: "?param=value",
          searchParams: new URLSearchParams("?param=value"),
        },
        url: "https://example.com/barcelona/tots/events?param=value",
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      await middleware(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL(
          "/barcelona/events?param=value",
          "https://example.com/barcelona/tots/events?param=value"
        ),
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

      await middleware(mockRequest);

      expect(NextResponse).toHaveBeenCalledWith(
        "Unauthorized: Missing security headers",
        { status: 401 }
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

      await middleware(mockRequest);

      expect(NextResponse).toHaveBeenCalledWith(
        "Unauthorized: Missing security headers",
        { status: 401 }
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

      await middleware(mockRequest);

      expect(NextResponse).toHaveBeenCalledWith(
        "Request timed out or has invalid timestamp",
        { status: 408 }
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

      await middleware(mockRequest);

      expect(NextResponse).toHaveBeenCalledWith(
        "Request timed out or has invalid timestamp",
        { status: 408 }
      );
    });

    it("returns 408 for expired timestamp", async () => {
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

      await middleware(mockRequest);

      expect(NextResponse).toHaveBeenCalledWith(
        "Request timed out or has invalid timestamp",
        { status: 408 }
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

      // Mock verifyHmac to return false
      (globalThis.crypto.subtle.verify as Mock).mockResolvedValue(false);

      await middleware(mockRequest);

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

      await middleware(mockRequest);

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

      await middleware(mockRequest);

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

      await middleware(mockRequest);

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

      await middleware(mockRequest);

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

      await middleware(mockRequest);

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

      await middleware(mockRequest);

      expect(NextResponse.next).toHaveBeenCalled();
    });
  });

  describe("CSP and security headers", () => {
    it("adds security headers to non-API routes", async () => {
      const mockRequest = {
        nextUrl: { pathname: "/home", search: "" },
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      const mockResponse = {
        headers: new Headers(),
      };
      (NextResponse.next as Mock).mockReturnValue(mockResponse);

      await middleware(mockRequest);

      expect(mockResponse.headers.get("Content-Security-Policy")).toBeDefined();
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

    it("sets nonce in request headers", async () => {
      const mockRequest = {
        nextUrl: { pathname: "/home", search: "" },
        headers: new Headers(),
        method: "GET",
      } as unknown as NextRequest;

      const mockResponse = {
        headers: new Headers(),
      };
      (NextResponse.next as Mock).mockReturnValue(mockResponse);

      await middleware(mockRequest);

      const nextResponseCall = (NextResponse.next as Mock).mock.calls[0][0];
      expect(nextResponseCall.request.headers.get("x-nonce")).toBe("test-uuid");
      expect(nextResponseCall.request.headers.get("x-pathname")).toBe("/home");
    });
  });
});
