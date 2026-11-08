import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import proxy from "../proxy";
import { resolvePlaceForProxy } from "../lib/api/places-proxy";
import { getCategoriesForProxy } from "../lib/api/categories-proxy";
import { isProfileMissingForProxy } from "../lib/api/profiles-proxy";
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
    options?: { status?: number; headers?: HeadersInit },
  ) {
    return {
      status: options?.status || 200,
      headers: new Headers(options?.headers),
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

vi.mock("../lib/api/places-proxy", () => ({
  resolvePlaceForProxy: vi.fn(),
}));

vi.mock("../lib/api/categories-proxy", () => ({
  getCategoriesForProxy: vi.fn(),
}));

vi.mock("../lib/api/profiles-proxy", () => ({
  isProfileMissingForProxy: vi.fn().mockResolvedValue(false),
  PROFILE_EXISTS_TTL_MS: 300_000,
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
    (resolvePlaceForProxy as Mock).mockReset();
    (isProfileMissingForProxy as Mock).mockReset().mockResolvedValue(false);
    (resolvePlaceForProxy as Mock).mockResolvedValue({ kind: "unknown" });
    (getCategoriesForProxy as Mock).mockReset();
    (getCategoriesForProxy as Mock).mockResolvedValue(null);
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

    describe("Cloudflare Cache-Tag", () => {
      async function cacheTagFor(pathname: string, headers: Record<string, string> = {}) {
        process.env.NEXT_PUBLIC_SITE_URL = "https://www.esdeveniments.cat";
        const mockRequest = {
          nextUrl: mockNextUrl({ pathname }),
          headers: new Headers({
            accept: "text/html",
            // Tags use the configured site host, never the request Host.
            host: "internal-proxy:3000",
            ...headers,
          }),
          method: "GET",
        } as unknown as NextRequest;
        const mockResponse = () => ({ headers: new Headers(), cookies: { set: vi.fn() } });
        (NextResponse.rewrite as Mock).mockReturnValue(mockResponse());
        (NextResponse.next as Mock).mockReturnValue(mockResponse());

        const result = await proxy(mockRequest);
        return {
          cacheTag: result.headers.get("Cache-Tag"),
          cacheControl: result.headers.get("Cache-Control"),
        };
      }

      it.each([
        ["/", "www.esdeveniments.cat:html,www.esdeveniments.cat:home"],
        ["/es", "www.esdeveniments.cat:html,www.esdeveniments.cat:home"],
        ["/catalunya", "www.esdeveniments.cat:html,www.esdeveniments.cat:place:catalunya"],
        ["/es/catalunya/avui/musica", "www.esdeveniments.cat:html,www.esdeveniments.cat:place:catalunya"],
        ["/e/concert-a-girona", "www.esdeveniments.cat:html,www.esdeveniments.cat:event:concert-a-girona"],
        ["/en/perfil/creator", "www.esdeveniments.cat:html,www.esdeveniments.cat:user:creator"],
        ["/perfil/creator/passats", "www.esdeveniments.cat:html,www.esdeveniments.cat:user:creator"],
      ])("tags the public page %s", async (pathname, expected) => {
        const { cacheTag, cacheControl } = await cacheTagFor(pathname);

        expect(cacheControl).toContain("s-maxage=1800");
        expect(cacheTag).toBe(expected);
      });

      it.each([
        "/preferits",
        "/preferits/passats",
        "/es/preferits/passats",
        "/perfil/edita",
        "/e/concert/edita",
        "/e/concert/promote",
      ])(
        "does not tag the private page %s",
        async (pathname) => {
          const { cacheTag, cacheControl } = await cacheTagFor(pathname);

          expect(cacheControl).toBe("private, no-store");
          expect(cacheTag).toBeNull();
        },
      );

      it("does not tag AI-bot responses, which are never CDN-cached", async () => {
        const { cacheTag, cacheControl } = await cacheTagFor("/catalunya", {
          "user-agent": "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)",
        });

        expect(cacheControl).toBe("private, no-store");
        expect(cacheTag).toBeNull();
      });
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

    it("never lets the CDN cache owner-only promote pages", async () => {
      const mockRequest = {
        nextUrl: mockNextUrl({
          pathname: "/e/concert/promote/success",
          search: "",
          searchParams: new URLSearchParams(),
        }),
        headers: new Headers({ accept: "text/html" }),
        method: "GET",
      } as unknown as NextRequest;

      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(mockRequest);

      expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    });

    it.each(["/e/concert/promot%65/success", "/e/concert//PROMOTE"])(
      "keeps the variant path %s out of the CDN cache",
      async (pathname) => {
        const mockRequest = {
          nextUrl: mockNextUrl({ pathname, search: "", searchParams: new URLSearchParams() }),
          headers: new Headers({ accept: "text/html" }),
          method: "GET",
        } as unknown as NextRequest;
        const mockResponse = { headers: new Headers() };
        (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

        const result = await proxy(mockRequest);

        expect(result.headers.get("Cache-Control")).toBe("private, no-store");
      },
    );

    it("sends the Stripe promotion return page to the visitor's locale", async () => {
      const mockRequest = {
        nextUrl: mockNextUrl({
          pathname: "/e/concert/promote/success",
          search: "",
          searchParams: new URLSearchParams(),
        }),
        url: "https://example.com/e/concert/promote/success",
        headers: new Headers(),
        cookies: {
          get: vi.fn((name: string) =>
            name === "NEXT_LOCALE" ? { value: "es" } : undefined,
          ),
        },
        method: "GET",
      } as unknown as NextRequest;

      await proxy(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL(
          "/es/e/concert/promote/success",
          "https://example.com/e/concert/promote/success",
        ),
        302,
      );
    });

    it("reads Accept-Language q-values written with spaces (RFC 9110)", async () => {
      const mockRequest = {
        nextUrl: mockNextUrl({ pathname: "/" }),
        url: "https://example.com/",
        headers: new Headers({ "accept-language": "ca;q=0.5, es; q=0.9" }),
        method: "GET",
      } as unknown as NextRequest;
      (NextResponse.redirect as Mock).mockReturnValue({
        headers: new Headers(),
        cookies: { set: vi.fn() },
      });

      await proxy(mockRequest);

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL("/es", "https://example.com/"),
        302,
      );
    });

    it("keeps AI-bot renders out of the CDN cache without touching the UA", async () => {
      const ua = "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)";
      const mockRequest = {
        nextUrl: mockNextUrl({ pathname: "/barcelona" }),
        headers: new Headers({ "user-agent": ua }),
        method: "GET",
      } as unknown as NextRequest;
      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(mockRequest);

      expect(result.headers.get("Cache-Control")).toBe("private, no-store");
      const [, init] = (NextResponse.rewrite as Mock).mock.calls[0];
      expect(init.request.headers.get("user-agent")).toBe(ua);
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

  describe("place existence (real 404 / alias 301)", () => {
    function placeRequest(pathname: string, method = "GET", search = "") {
      return {
        nextUrl: mockNextUrl({ pathname, search }),
        headers: new Headers({ accept: "text/html" }),
        method,
      } as unknown as NextRequest;
    }

    it("301s an alias to the real slug, keeping locale, segments and query", async () => {
      (resolvePlaceForProxy as Mock).mockResolvedValue({
        kind: "alias",
        slug: "la-garriga",
      });

      await proxy(placeRequest("/es/lagarriga/avui", "GET", "?search=jazz"));

      expect(resolvePlaceForProxy).toHaveBeenCalledWith("lagarriga");
      const [url, status] = (NextResponse.redirect as Mock).mock.calls[0];
      expect(status).toBe(301);
      expect(url.pathname).toBe("/es/la-garriga/avui");
      expect(url.search).toBe("?search=jazz");
    });

    it("rewrites a missing place with a 404 status and keeps page headers", async () => {
      (resolvePlaceForProxy as Mock).mockResolvedValue({ kind: "missing" });
      (NextResponse.rewrite as Mock).mockReturnValue({ headers: new Headers() });

      const result = await proxy(placeRequest("/no-such-place"));

      const [url, init] = (NextResponse.rewrite as Mock).mock.calls[0];
      expect(url.pathname).toBe("/ca/no-such-place");
      expect(init.status).toBe(404);
      expect(init.request.headers.get("x-next-intl-locale")).toBe("ca");
      expect(result.headers.get("content-security-policy")).toContain(
        "default-src 'self'",
      );
    });

    it("serves the page as before when the check can't decide", async () => {
      (NextResponse.rewrite as Mock).mockReturnValue({ headers: new Headers() });

      await proxy(placeRequest("/barcelona"));

      const [, init] = (NextResponse.rewrite as Mock).mock.calls[0];
      expect(init.status).toBeUndefined();
    });

    it.each([
      ["a non-GET request", "/barcelona", "POST"],
      ["an app route", "/noticies", "GET"],
      ["catalunya", "/catalunya", "GET"],
      ["a deep path", "/barcelona/avui/teatre/extra", "GET"],
    ])("skips the backend check for %s", async (_, pathname, method) => {
      (NextResponse.rewrite as Mock).mockReturnValue({ headers: new Headers() });

      await proxy(placeRequest(pathname, method));

      expect(resolvePlaceForProxy).not.toHaveBeenCalled();
    });
  });

  describe("markdown negotiation", () => {
    const mdRequest = (pathname: string) =>
      ({
        nextUrl: mockNextUrl({ pathname }),
        headers: new Headers({ accept: "text/markdown" }),
        method: "GET",
      }) as unknown as NextRequest;

    it("serves the homepage's markdown twin", async () => {
      await proxy(mdRequest("/"));

      const [url, init] = (NextResponse.rewrite as Mock).mock.calls[0];
      expect(url.pathname).toBe("/index.md");
      expect(init.request.headers.get("x-markdown-negotiation")).toBe("1");
    });

    it("serves the llms.txt guide for other pages", async () => {
      await proxy(mdRequest("/barcelona"));

      const [url] = (NextResponse.rewrite as Mock).mock.calls[0];
      expect(url.pathname).toBe("/llms.txt");
    });

    it("answers a missing place with a markdown 404", async () => {
      (resolvePlaceForProxy as Mock).mockResolvedValue({ kind: "missing" });

      const result = await proxy(mdRequest("/no-such-place"));

      expect(result.status).toBe(404);
      expect(result.headers.get("content-type")).toContain("text/markdown");
      expect(result.headers.get("cache-control")).toBe("private, no-store");
      expect(result.headers.get("vary")).toBe("Accept");
      expect(NextResponse.rewrite).not.toHaveBeenCalled();
    });

    it("advertises the markdown twin only on the homepage", async () => {
      (NextResponse.rewrite as Mock).mockImplementation(() => ({
        headers: new Headers(),
      }));
      const htmlRequest = (pathname: string) =>
        ({
          nextUrl: mockNextUrl({ pathname }),
          headers: new Headers({ accept: "text/html" }),
          method: "GET",
        }) as unknown as NextRequest;

      const home = await proxy(htmlRequest("/"));
      const place = await proxy(htmlRequest("/barcelona"));

      expect(home.headers.get("link")).toContain(
        '</index.md>; rel="alternate"; type="text/markdown"',
      );
      expect(place.headers.get("link")).not.toContain("index.md");
    });
  });

  describe("profile existence (real 404)", () => {
    const profileRequest = (pathname: string, method = "GET") =>
      ({
        nextUrl: mockNextUrl({ pathname }),
        headers: new Headers({ accept: "text/html", host: "www.esdeveniments.cat" }),
        method,
      }) as unknown as NextRequest;

    it("rewrites an unknown username with a 404 and a short CDN TTL", async () => {
      (isProfileMissingForProxy as Mock).mockResolvedValue(true);
      (NextResponse.rewrite as Mock).mockReturnValue({ headers: new Headers() });

      const result = await proxy(profileRequest("/perfil/nobody/passats"));

      expect(isProfileMissingForProxy).toHaveBeenCalledWith("nobody");
      const [url, init] = (NextResponse.rewrite as Mock).mock.calls[0];
      expect(url.pathname).toBe("/ca/perfil/nobody/passats");
      expect(init.status).toBe(404);
      expect(result.headers.get("cache-control")).toBe(
        "public, max-age=0, s-maxage=300",
      );
    });

    it("serves a known profile with the normal status and cache", async () => {
      (NextResponse.rewrite as Mock).mockReturnValue({ headers: new Headers() });

      const result = await proxy(profileRequest("/perfil/somebody"));

      const [, init] = (NextResponse.rewrite as Mock).mock.calls[0];
      expect(init.status).toBeUndefined();
      expect(result.headers.get("cache-control")).toContain("s-maxage=1800");
    });

    it.each([
      ["the edit form", "/perfil/edita", "GET"],
      ["a non-GET request", "/perfil/somebody", "POST"],
      ["an invalid username", "/perfil/foo--bar", "GET"],
      ["a deeper path", "/perfil/somebody/other", "GET"],
    ])("skips the backend check for %s", async (_, pathname, method) => {
      (NextResponse.rewrite as Mock).mockReturnValue({ headers: new Headers() });

      await proxy(profileRequest(pathname, method));

      expect(isProfileMissingForProxy).not.toHaveBeenCalled();
    });
  });

  describe("unknown category (301 instead of a soft 404)", () => {
    function listingRequest(pathname: string, search = "") {
      return {
        nextUrl: mockNextUrl({ pathname, search }),
        headers: new Headers({ accept: "text/html" }),
        method: "GET",
      } as unknown as NextRequest;
    }

    beforeEach(() => {
      (getCategoriesForProxy as Mock).mockResolvedValue([
        { id: 1, name: "Teatre", slug: "teatre" },
        { id: 2, name: "Música", slug: "musica" },
      ]);
      (NextResponse.rewrite as Mock).mockReturnValue({ headers: new Headers() });
      (NextResponse.next as Mock).mockReturnValue({ headers: new Headers() });
    });

    it.each([
      ["/barcelona/concerts", "", "/barcelona"],
      ["/es/barcelona/avui/concerts", "?search=jazz", "/es/barcelona/avui"],
      ["/barcelona/ahir/teatre", "", "/barcelona/teatre"],
      ["/catalunya/concerts", "", "/catalunya"],
    ])("301s %s%s to %s", async (pathname, search, target) => {
      await proxy(listingRequest(pathname, search));

      const [url, status] = (NextResponse.redirect as Mock).mock.calls[0];
      expect(status).toBe(301);
      expect(url.pathname).toBe(target);
      expect(url.search).toBe(search);
    });

    it("caps how long browsers keep the category 301", async () => {
      const response = await proxy(listingRequest("/barcelona/concerts"));
      expect(response?.headers.get("Cache-Control")).toBe(
        "private, max-age=3600",
      );
    });

    it.each(["/barcelona/teatre", "/barcelona/avui/musica"])(
      "serves %s as before",
      async (pathname) => {
        await proxy(listingRequest(pathname));
        expect(NextResponse.redirect).not.toHaveBeenCalled();
      },
    );

    it("skips the category lookup for a date-only path", async () => {
      await proxy(listingRequest("/barcelona/avui"));
      expect(getCategoriesForProxy).not.toHaveBeenCalled();
    });

    it("fails open when the categories can't be loaded", async () => {
      (getCategoriesForProxy as Mock).mockResolvedValue(null);
      await proxy(listingRequest("/barcelona/concerts"));
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it("keeps the 404 for a missing place", async () => {
      (resolvePlaceForProxy as Mock).mockResolvedValue({ kind: "missing" });
      await proxy(listingRequest("/no-such-place/concerts"));
      expect(NextResponse.redirect).not.toHaveBeenCalled();
      expect((NextResponse.rewrite as Mock).mock.calls[0][1].status).toBe(404);
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
  });

  describe("X-Robots-Tag (3-segment listing pages)", () => {
    /**
     * GSC audit (April 2026) found that /[place]/[date]/[category] URLs
     * generated thin/duplicate content flagged as "Crawled - currently not
     * indexed". The proxy now emits noindex,follow for these so crawlers
     * still discover the canonical /[place]/[category] page.
     */
    function buildPathRequest(
      pathname: string,
      host = "www.esdeveniments.cat",
    ): NextRequest {
      return {
        nextUrl: mockNextUrl({
          pathname,
          search: "",
          searchParams: new URLSearchParams(),
        }),
        headers: new Headers({ host, accept: "text/html" }),
        method: "GET",
      } as unknown as NextRequest;
    }

    it.each([
      "/barcelona/avui/musica",
      "/barcelona/dema/teatre",
      "/valles-oriental/setmana/festes-populars",
      "/girona/cap-de-setmana/exposicions",
    ])("sets noindex,follow on %s", async (pathname) => {
      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(buildPathRequest(pathname));

      expect(result.headers.get("X-Robots-Tag")).toBe("noindex, follow");
    });

    it("does NOT set noindex on canonical 2-segment /[place]/[category]", async () => {
      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(buildPathRequest("/barcelona/musica"));

      expect(result.headers.get("X-Robots-Tag")).toBeNull();
    });

    it("does NOT set noindex on /[place]/[category] for unrelated date-like slugs", async () => {
      // Not in VALID_DATES → must not match the 3-segment heuristic.
      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(
        buildPathRequest("/barcelona/historia/musica"),
      );

      expect(result.headers.get("X-Robots-Tag")).toBeNull();
    });

    it("does NOT match 1-segment /[place]", async () => {
      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(buildPathRequest("/barcelona"));

      expect(result.headers.get("X-Robots-Tag")).toBeNull();
    });

    it("does NOT match 4-segment paths", async () => {
      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(
        buildPathRequest("/barcelona/avui/musica/extra"),
      );

      expect(result.headers.get("X-Robots-Tag")).toBeNull();
    });

    it("matches 3-segment paths under a locale prefix (/es, /en)", async () => {
      const mockResponse = { headers: new Headers() };
      (NextResponse.rewrite as Mock).mockReturnValue(mockResponse);

      const result = await proxy(
        buildPathRequest("/es/barcelona/avui/musica"),
      );

      expect(result.headers.get("X-Robots-Tag")).toBe("noindex, follow");
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

    it("rejects multipart/form-data on protected HMAC routes", async () => {
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
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: "Unsupported media type" },
        { status: 415 },
      );
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

  // The static security headers (HSTS, X-Frame-Options, …) come from
  // next.config.js headers(); Proxy only adds the CSP to pages.
  describe("CSP", () => {
    it("adds an enforced CSP to page responses", async () => {
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
      const csp = mockResponse.headers.get("Content-Security-Policy") ?? "";
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'self'");
      expect(
        mockResponse.headers.get("Content-Security-Policy-Report-Only"),
      ).toBeNull();
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
