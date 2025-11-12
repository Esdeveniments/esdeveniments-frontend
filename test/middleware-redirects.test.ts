import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { handleCanonicalRedirects } from "../utils/middleware-redirects";

// Mock NextResponse
vi.mock("next/server", () => {
  const MockNextResponse = {
    redirect: vi.fn((url: URL, status: number) => ({
      status,
      url: url.toString(),
    })),
  };

  return {
    NextRequest: vi.fn(),
    NextResponse: MockNextResponse,
  };
});

describe("handleCanonicalRedirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(
    pathname: string,
    search: string = ""
  ): NextRequest {
    const url = new URL(`https://example.com${pathname}${search}`);
    return {
      nextUrl: {
        pathname,
        search,
        searchParams: url.searchParams,
      },
      url: url.toString(),
    } as unknown as NextRequest;
  }

  describe("tots redirects with query params", () => {
    it("preserves date query param for /place/tots/category?date=avui", () => {
      const request = createMockRequest("/barcelona/tots/teatre", "?date=avui");
      const result = handleCanonicalRedirects(request);

      expect(result).not.toBeNull();
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      expect(redirectUrl.pathname).toBe("/barcelona/avui/teatre");
    });

    it("preserves date query param for /place/tots/category?date=dema", () => {
      const request = createMockRequest(
        "/barcelona/tots/concerts",
        "?date=dema"
      );
      const result = handleCanonicalRedirects(request);

      expect(result).not.toBeNull();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      expect(redirectUrl.pathname).toBe("/barcelona/dema/concerts");
    });

    it("preserves category query param for /place/tots?category=teatre", () => {
      const request = createMockRequest("/barcelona/tots", "?category=teatre");
      const result = handleCanonicalRedirects(request);

      expect(result).not.toBeNull();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      expect(redirectUrl.pathname).toBe("/barcelona/teatre");
    });

    it("preserves both date and category query params for /place/tots?date=avui&category=teatre", () => {
      const request = createMockRequest(
        "/barcelona/tots",
        "?date=avui&category=teatre"
      );
      const result = handleCanonicalRedirects(request);

      expect(result).not.toBeNull();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      expect(redirectUrl.pathname).toBe("/barcelona/avui/teatre");
    });

    it("preserves other query params when redirecting /place/tots/category?date=avui&search=rock", () => {
      const request = createMockRequest(
        "/barcelona/tots/teatre",
        "?date=avui&search=rock"
      );
      const result = handleCanonicalRedirects(request);

      expect(result).not.toBeNull();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      expect(redirectUrl.pathname).toBe("/barcelona/avui/teatre");
      expect(redirectUrl.search).toBe("?search=rock");
    });
  });

  describe("basic tots redirects without query params", () => {
    it("redirects /place/tots/category to /place/category", () => {
      const request = createMockRequest("/barcelona/tots/teatre");
      const result = handleCanonicalRedirects(request);

      expect(result).not.toBeNull();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      expect(redirectUrl.pathname).toBe("/barcelona/teatre");
    });

    it("redirects /place/tots to /place", () => {
      const request = createMockRequest("/barcelona/tots");
      const result = handleCanonicalRedirects(request);

      expect(result).not.toBeNull();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      expect(redirectUrl.pathname).toBe("/barcelona");
    });
  });

  describe("date segment handling", () => {
    it("preserves date from segment when present", () => {
      const request = createMockRequest("/barcelona/avui/teatre");
      const result = handleCanonicalRedirects(request);

      // Should not redirect if already canonical
      expect(result).toBeNull();
    });

    it("extracts date from /place/date segment", () => {
      const request = createMockRequest("/barcelona/avui");
      const result = handleCanonicalRedirects(request);

      // Should not redirect if already canonical
      expect(result).toBeNull();
    });
  });

  describe("legacy query param redirects", () => {
    it("redirects /place?date=avui&category=teatre to /place/avui/teatre", () => {
      const request = createMockRequest(
        "/barcelona",
        "?date=avui&category=teatre"
      );
      const result = handleCanonicalRedirects(request);

      expect(result).not.toBeNull();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      expect(redirectUrl.pathname).toBe("/barcelona/avui/teatre");
    });

    it("redirects /place/date?category=foo to /place/date/foo", () => {
      const request = createMockRequest("/barcelona/avui", "?category=teatre");
      const result = handleCanonicalRedirects(request);

      expect(result).not.toBeNull();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      expect(redirectUrl.pathname).toBe("/barcelona/avui/teatre");
    });

    it("redirects /place/category?date=avui to /place/avui/category", () => {
      const request = createMockRequest("/barcelona/teatre", "?date=avui");
      const result = handleCanonicalRedirects(request);

      expect(result).not.toBeNull();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      expect(redirectUrl.pathname).toBe("/barcelona/avui/teatre");
    });
  });

  describe("non-place routes", () => {
    it("does not redirect non-place routes", () => {
      const request = createMockRequest("/noticies");
      const result = handleCanonicalRedirects(request);
      expect(result).toBeNull();
    });

    it("does not redirect login route", () => {
      const request = createMockRequest("/login");
      const result = handleCanonicalRedirects(request);
      expect(result).toBeNull();
    });
  });

  describe("invalid date slugs", () => {
    it("ignores invalid date query params", () => {
      const request = createMockRequest(
        "/barcelona/tots/teatre",
        "?date=invalid-date"
      );
      const result = handleCanonicalRedirects(request);

      expect(result).not.toBeNull();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      // Should redirect to /barcelona/teatre (no date since invalid)
      expect(redirectUrl.pathname).toBe("/barcelona/teatre");
    });

    it("ignores 'tots' as date query param", () => {
      const request = createMockRequest("/barcelona/tots/teatre", "?date=tots");
      const result = handleCanonicalRedirects(request);

      expect(result).not.toBeNull();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      // Should redirect to /barcelona/teatre (no date since tots is ignored)
      expect(redirectUrl.pathname).toBe("/barcelona/teatre");
    });
  });

  describe("redirect status code", () => {
    it("uses 301 status code for redirects", () => {
      const request = createMockRequest("/barcelona/tots/teatre", "?date=avui");
      const result = handleCanonicalRedirects(request);

      expect(result).not.toBeNull();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0];
      expect(redirectCall[1]).toBe(301);
    });
  });
});
