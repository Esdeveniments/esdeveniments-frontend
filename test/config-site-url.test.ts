import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getSiteUrl,
  getSiteUrlFromRequest,
  isInternalHost,
} from "../config/index";
import type { NextRequest } from "next/server";

const originalEnv = { ...process.env };

describe("config/index:getSiteUrl", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns NEXT_PUBLIC_SITE_URL when set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://custom.example.com";
    expect(getSiteUrl()).toBe("https://custom.example.com");
  });

  it("returns vercel.app URL for preview/development environments", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";
    expect(getSiteUrl()).toBe("https://esdeveniments.vercel.app");

    process.env.NEXT_PUBLIC_VERCEL_ENV = "development";
    expect(getSiteUrl()).toBe("https://esdeveniments.vercel.app");
  });

  it("returns localhost for non-production environments", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("returns production URL as fallback", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    expect(getSiteUrl()).toBe("https://www.esdeveniments.cat");
  });
});

describe("config/index:getSiteUrlFromRequest", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses request host when available and not localhost", () => {
    const mockRequest = {
      nextUrl: {
        protocol: "https:",
        host: "www.esdeveniments.cat",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    expect(getSiteUrlFromRequest(mockRequest)).toBe(
      "https://www.esdeveniments.cat"
    );
  });

  it("uses request host from headers when nextUrl.host is missing", () => {
    const mockRequest = {
      nextUrl: {
        protocol: "https:",
      },
      headers: new Headers({
        host: "www.esdeveniments.cat",
      }),
    } as unknown as NextRequest;

    expect(getSiteUrlFromRequest(mockRequest)).toBe(
      "https://www.esdeveniments.cat"
    );
  });

  it("defaults to https protocol when protocol is missing", () => {
    const mockRequest = {
      nextUrl: {
        host: "www.esdeveniments.cat",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    const result = getSiteUrlFromRequest(mockRequest);
    expect(result).toBe("https://www.esdeveniments.cat");
  });

  it("falls back to getSiteUrl() for localhost requests", () => {
    const mockRequest = {
      nextUrl: {
        protocol: "http:",
        host: "localhost:3000",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    // Should fall back to environment-based detection
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    expect(getSiteUrlFromRequest(mockRequest)).toBe("http://localhost:3000");
  });

  it("falls back to getSiteUrl() for 127.0.0.1 requests", () => {
    const mockRequest = {
      nextUrl: {
        protocol: "http:",
        host: "127.0.0.1:3000",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    expect(getSiteUrlFromRequest(mockRequest)).toBe("http://localhost:3000");
  });

  it("falls back to getSiteUrl() when request is undefined", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    expect(getSiteUrlFromRequest(undefined)).toBe("http://localhost:3000");
  });

  it("falls back to getSiteUrl() when request has no host", () => {
    const mockRequest = {
      nextUrl: {},
      headers: new Headers(),
    } as unknown as NextRequest;

    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
    expect(getSiteUrlFromRequest(mockRequest)).toBe("http://localhost:3000");
  });

  it("prefers request host over NEXT_PUBLIC_SITE_URL when request host is valid", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://custom.example.com";
    const mockRequest = {
      nextUrl: {
        protocol: "https:",
        host: "www.esdeveniments.cat",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    // Request host is checked first and takes precedence when not localhost
    expect(getSiteUrlFromRequest(mockRequest)).toBe(
      "https://www.esdeveniments.cat"
    );
  });

  it("handles production request correctly", () => {
    const mockRequest = {
      nextUrl: {
        protocol: "https:",
        host: "www.esdeveniments.cat",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";

    // Should use request host, not fallback
    expect(getSiteUrlFromRequest(mockRequest)).toBe(
      "https://www.esdeveniments.cat"
    );
  });

  it("handles preview deployment request correctly", () => {
    const mockRequest = {
      nextUrl: {
        protocol: "https:",
        host: "preview-abc123.vercel.app",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;

    // Should use request host
    expect(getSiteUrlFromRequest(mockRequest)).toBe(
      "https://preview-abc123.vercel.app"
    );
  });

  it("falls back to getSiteUrl() for CloudFront distribution domains", () => {
    const mockRequest = {
      nextUrl: {
        protocol: "https:",
        host: "d1234567890abc.cloudfront.net",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
    // Should fall back to env var instead of using CloudFront domain
    expect(getSiteUrlFromRequest(mockRequest)).toBe(
      "https://www.esdeveniments.cat"
    );
  });

  it("falls back to getSiteUrl() for Lambda function URLs", () => {
    const mockRequest = {
      nextUrl: {
        protocol: "https:",
        host: "abc123.lambda-url.eu-west-3.on.aws",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
    // Should fall back to env var instead of using Lambda URL
    expect(getSiteUrlFromRequest(mockRequest)).toBe(
      "https://www.esdeveniments.cat"
    );
  });

  it("uses x-forwarded-host header when nextUrl.host is missing (reverse proxy)", () => {
    const mockRequest = {
      nextUrl: {
        protocol: "https:",
      },
      headers: new Headers({
        "x-forwarded-host": "www.esdeveniments.cat",
      }),
    } as unknown as NextRequest;

    // Should use x-forwarded-host header
    expect(getSiteUrlFromRequest(mockRequest)).toBe(
      "https://www.esdeveniments.cat"
    );
  });

  it("prefers nextUrl.host over x-forwarded-host header", () => {
    const mockRequest = {
      nextUrl: {
        protocol: "https:",
        host: "www.esdeveniments.cat",
      },
      headers: new Headers({
        "x-forwarded-host": "different.example.com",
      }),
    } as unknown as NextRequest;

    // Should prefer nextUrl.host
    expect(getSiteUrlFromRequest(mockRequest)).toBe(
      "https://www.esdeveniments.cat"
    );
  });

  it("falls back to getSiteUrl() for 0.0.0.0 (Docker HOSTNAME)", () => {
    const mockRequest = {
      nextUrl: {
        protocol: "http:",
        host: "0.0.0.0:3000",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
    expect(getSiteUrlFromRequest(mockRequest)).toBe(
      "https://www.esdeveniments.cat"
    );
  });

  it("falls back to getSiteUrl() for RFC 1918 private IPs", () => {
    const privateHosts = [
      "10.0.0.1:3000",
      "10.42.0.5:3000",
      "172.16.0.1:3000",
      "172.31.255.255:3000",
      "192.168.1.1:3000",
      "192.168.0.100:3000",
    ];

    process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";

    for (const host of privateHosts) {
      const mockRequest = {
        nextUrl: { protocol: "http:", host },
        headers: new Headers(),
      } as unknown as NextRequest;

      expect(getSiteUrlFromRequest(mockRequest)).toBe(
        "https://www.esdeveniments.cat"
      );
    }
  });

  it("falls back to getSiteUrl() for .internal and .local domains", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
    (process.env as { NODE_ENV?: string }).NODE_ENV = "production";

    for (const host of ["app.internal", "myhost.local"]) {
      const mockRequest = {
        nextUrl: { protocol: "http:", host },
        headers: new Headers(),
      } as unknown as NextRequest;

      expect(getSiteUrlFromRequest(mockRequest)).toBe(
        "https://www.esdeveniments.cat"
      );
    }
  });
});

describe("config/index:isInternalHost", () => {
  it("detects Docker bind address 0.0.0.0", () => {
    expect(isInternalHost("0.0.0.0:3000")).toBe(true);
    expect(isInternalHost("0.0.0.0")).toBe(true);
  });

  it("detects localhost variants", () => {
    expect(isInternalHost("localhost")).toBe(true);
    expect(isInternalHost("localhost:3000")).toBe(true);
    expect(isInternalHost("127.0.0.1:3000")).toBe(true);
    expect(isInternalHost("127.0.0.42")).toBe(true);
  });

  it("detects IPv6 loopback", () => {
    expect(isInternalHost("::1")).toBe(true);
    expect(isInternalHost("[::1]")).toBe(true);
  });

  it("detects RFC 1918 private ranges", () => {
    expect(isInternalHost("10.0.0.1")).toBe(true);
    expect(isInternalHost("10.42.0.5:3000")).toBe(true);
    expect(isInternalHost("172.16.0.1")).toBe(true);
    expect(isInternalHost("172.31.255.255")).toBe(true);
    expect(isInternalHost("192.168.1.1")).toBe(true);
    expect(isInternalHost("192.168.0.100:3000")).toBe(true);
  });

  it("detects link-local addresses", () => {
    expect(isInternalHost("169.254.0.1")).toBe(true);
    expect(isInternalHost("169.254.169.254")).toBe(true);
  });

  it("detects infrastructure domains", () => {
    expect(isInternalHost("d123.cloudfront.net")).toBe(true);
    expect(isInternalHost("abc.lambda-url.eu-west-3.on.aws")).toBe(true);
    expect(isInternalHost("app.internal")).toBe(true);
    expect(isInternalHost("myhost.local")).toBe(true);
  });

  it("allows real public domains", () => {
    expect(isInternalHost("www.esdeveniments.cat")).toBe(false);
    expect(isInternalHost("esdeveniments.cat")).toBe(false);
    expect(isInternalHost("preview-abc.vercel.app")).toBe(false);
    expect(isInternalHost("pr-123.esdeveniments.cat")).toBe(false);
  });

  it("does not false-positive on IPs outside private ranges", () => {
    expect(isInternalHost("172.15.0.1")).toBe(false);
    expect(isInternalHost("172.32.0.1")).toBe(false);
    expect(isInternalHost("8.8.8.8")).toBe(false);
    expect(isInternalHost("1.1.1.1")).toBe(false);
  });
});

