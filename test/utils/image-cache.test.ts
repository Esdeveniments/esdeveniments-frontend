import { describe, it, expect } from "vitest";
import {
  buildOptimizedImageUrl,
  normalizeExternalImageUrl,
  withImageCacheKey,
} from "@utils/image-cache";

describe("withImageCacheKey", () => {
  it("appends cache key to absolute URLs", () => {
    const url = "https://cdn.example.com/image.jpg";
    const result = withImageCacheKey(url, "hash-123");
    expect(result).toContain("hash-123");
    expect(result).toMatch(/\?v=hash-123$/);
  });

  it("replaces an existing cache key", () => {
    const url = "https://cdn.example.com/image.jpg?v=old";
    const result = withImageCacheKey(url, "new-key");
    expect(result).toContain("v=new-key");
    expect(result).not.toContain("old");
  });

  it("handles relative URLs", () => {
    const url = "/static/images/photo.png";
    const result = withImageCacheKey(url, "rel-key");
    expect(result.startsWith("/static/images/photo.png?v=")).toBe(true);
    expect(result).toContain("rel-key");
  });

  describe("protocol-relative URLs", () => {
    it("normalizes protocol-relative URLs to HTTPS with cache key", () => {
      const url = "//cdn.appculturamataro.cat/medias/image.jpeg";
      const result = withImageCacheKey(url, "hash-abc");
      expect(result).toMatch(/^https:\/\//);
      expect(result).toContain("cdn.appculturamataro.cat");
      expect(result).toContain("v=hash-abc");
    });

    it("normalizes protocol-relative URLs to HTTPS without cache key", () => {
      const url = "//cdn.example.com/image.jpg";
      const result = withImageCacheKey(url, null);
      expect(result).toBe("https://cdn.example.com/image.jpg");
    });

    it("handles protocol-relative URLs with existing query params", () => {
      const url = "//cdn.example.com/image.jpg?size=large";
      const result = withImageCacheKey(url, "v123");
      expect(result).toMatch(/^https:\/\//);
      expect(result).toContain("size=large");
      expect(result).toContain("v=v123");
    });
  });

  it("returns original URL when cache key is missing", () => {
    const url = "https://cdn.example.com/image.jpg";
    expect(withImageCacheKey(url, null)).toBe(url);
    expect(withImageCacheKey(url, undefined)).toBe(url);
  });

  it("normalizes double slashes and applies cache key", () => {
    const url =
      "https://www.bot.altanet.org//sites/bot/files/recursos/document_0.jpg?v=old";
    const result = withImageCacheKey(url, "new");
    expect(result).toBe(
      "https://www.bot.altanet.org/sites/bot/files/recursos/document_0.jpg?v=new"
    );
  });
});

describe("normalizeExternalImageUrl", () => {
  it("preserves http protocol (proxy decides https-first)", () => {
    expect(normalizeExternalImageUrl("http://example.com/image.jpg")).toBe(
      "http://example.com/image.jpg"
    );
  });

  it("keeps localhost http", () => {
    expect(normalizeExternalImageUrl("http://localhost:3000/img.png")).toBe(
      "http://localhost:3000/img.png"
    );
  });

  it("collapses duplicate slashes in pathname", () => {
    expect(normalizeExternalImageUrl("https://a.com//foo//bar.jpg")).toBe(
      "https://a.com/foo/bar.jpg"
    );
  });

  it("returns empty for invalid URL", () => {
    expect(normalizeExternalImageUrl("ht!tp://")).toBe("");
  });

  it("returns empty for overly long URLs (triggers fallback image)", () => {
    const longUrl = `https://example.com/${"a".repeat(2100)}.jpg`;
    expect(normalizeExternalImageUrl(longUrl)).toBe("");
  });
});

describe("buildOptimizedImageUrl", () => {
  it("proxies HTTPS absolute URLs (ensures cache key stripping in proxy)", () => {
    const result = buildOptimizedImageUrl("https://example.com/img.jpg", "k1");
    expect(result).toMatch(/^\/api\/image-proxy\?url=/);
    expect(decodeURIComponent(result.split("url=")[1])).toContain(
      "https://example.com/img.jpg?v=k1"
    );
  });

  it("proxies HTTP absolute URLs (mixed content)", () => {
    const result = buildOptimizedImageUrl("http://example.com/img.jpg", "k1");
    expect(result).toMatch(/^\/api\/image-proxy\?url=/);
    expect(decodeURIComponent(result.split("url=")[1])).toContain(
      "http://example.com/img.jpg?v=k1"
    );
  });

  it("proxies known-bad TLS hostname even when HTTPS (allows HTTP fallback)", () => {
    const result = buildOptimizedImageUrl(
      "https://www.bot.altanet.org/sites/bot/files/recursos/document_0.jpg",
      "k3"
    );
    expect(result).toMatch(/^\/api\/image-proxy\?url=/);
  });

  it("proxies biguesiriells.cat HTTPS URLs (incomplete SSL chain)", () => {
    const result = buildOptimizedImageUrl(
      "https://www.biguesiriells.cat/sites/default/files/imagen.jpg",
      "k4"
    );
    expect(result).toMatch(/^\/api\/image-proxy\?url=/);
    expect(decodeURIComponent(result.split("url=")[1])).toContain(
      "https://www.biguesiriells.cat/sites/default/files/imagen.jpg?v=k4"
    );
  });

  it("keeps relative URLs unproxied but normalized", () => {
    const result = buildOptimizedImageUrl("/static/img.png", "k2");
    expect(result).toBe("/static/img.png?v=k2");
  });
});

describe("hydration consistency (string-based operations)", () => {
  it("produces byte-identical output for same input (no URL object variance)", () => {
    const url = "https://cdn.appculturamataro.cat/medias/agenda/2025/c_crop,x_51,y_36,w_1948,h_1014/image.jpg";
    const key = "abc123";

    // withImageCacheKey: same output for same input
    const result1 = withImageCacheKey(url, key);
    const result2 = withImageCacheKey(url, key);
    expect(result1).toBe(result2);
    expect(result1).toBe(`${url}?v=${key}`);

    // buildOptimizedImageUrl: proxies all external URLs now
    const result3 = buildOptimizedImageUrl(url, key);
    const result4 = buildOptimizedImageUrl(url, key);
    expect(result3).toBe(result4);
    expect(result3).toMatch(/^\/api\/image-proxy\?url=/);
  });

  it("preserves special characters like commas in URL path (hydration safety)", () => {
    // This URL caused hydration mismatch because URL.toString() encodes commas differently
    // on Node.js vs browser. String-based operations must be used.
    const url =
      "https://cdn.appculturamataro.cat/medias/agenda/2025/c_crop,x_51,y_36,w_1948,h_1014/image.jpg";
    const key = "abc123";

    const result = buildOptimizedImageUrl(url, key);

    // The proxy URL should contain the URL-encoded version (commas become %2C)
    // This is correct and consistent - what matters is server/client produce identical output
    expect(result).toContain(encodeURIComponent("c_crop,x_51,y_36,w_1948,h_1014"));
    // Cache key should be added
    expect(result).toContain(encodeURIComponent(`?v=${key}`));
    // Multiple calls should produce identical output (hydration safe)
    expect(buildOptimizedImageUrl(url, key)).toBe(result);
  });

  it("preserves already-encoded characters without double-encoding", () => {
    const url = "https://example.com/path%20with%20spaces/image.jpg";
    const result = normalizeExternalImageUrl(url);
    // Should NOT double-encode %20 into %2520
    expect(result).toBe(url);
  });

  it("handles URLs with existing query params deterministically", () => {
    const url = "https://example.com/img.jpg?size=large&format=webp";
    const result = withImageCacheKey(url, "v1");
    expect(result).toBe("https://example.com/img.jpg?size=large&format=webp&v=v1");
  });

  it("handles URLs with hash fragments correctly", () => {
    const url = "https://example.com/img.jpg#section";
    const result = withImageCacheKey(url, "v1");
    expect(result).toBe("https://example.com/img.jpg?v=v1#section");
  });

  it("handles URLs with both query and hash", () => {
    const url = "https://example.com/img.jpg?foo=bar#section";
    const result = withImageCacheKey(url, "v1");
    expect(result).toBe("https://example.com/img.jpg?foo=bar&v=v1#section");
  });
});

describe("image proxy cache key stripping", () => {
  // These tests document the behavior that the image proxy strips ?v= before
  // fetching upstream, since some external servers reject URLs with unknown query params.
  // CloudFront still caches by the full proxy URL (with ?v=), so cache-busting works.

  it("withImageCacheKey adds ?v= that would be stripped by proxy before upstream fetch", () => {
    const original = "https://www.cinemaesbarjo.cat/wp-content/uploads/image.jpg";
    const withKey = withImageCacheKey(original, "abc123");
    expect(withKey).toBe("https://www.cinemaesbarjo.cat/wp-content/uploads/image.jpg?v=abc123");

    // Simulate what the proxy does: strip ?v= before fetching upstream
    const url = new URL(withKey);
    url.searchParams.delete("v");
    const upstreamUrl = url.toString();

    expect(upstreamUrl).toBe(original);
  });

  it("stripping ?v= preserves other query params", () => {
    const withKey = "https://example.com/img.jpg?size=large&v=abc123&format=webp";

    const url = new URL(withKey);
    url.searchParams.delete("v");
    const upstreamUrl = url.toString();

    expect(upstreamUrl).toBe("https://example.com/img.jpg?size=large&format=webp");
  });

  it("stripping ?v= when it is the only param leaves clean URL", () => {
    const withKey = "https://example.com/img.jpg?v=abc123";

    const url = new URL(withKey);
    url.searchParams.delete("v");
    const upstreamUrl = url.toString();

    expect(upstreamUrl).toBe("https://example.com/img.jpg");
  });

  it("real-world case: cinemaesbarjo.cat image with hash cache key", () => {
    // This specific URL was returning 403 when ?v= was sent to the server
    const original =
      "https://www.cinemaesbarjo.cat/wp-content/uploads/2025/12/frontera-117220420-large.jpg";
    const cacheKey =
      "cdd32fedec81e79c19fb0095e424adf4e8a93ff2779f679299c088ca52e2a6a3";

    // buildOptimizedImageUrl should return a proxy URL
    const optimized = buildOptimizedImageUrl(original, cacheKey);
    expect(optimized).toMatch(/^\/api\/image-proxy\?url=/);

    // The proxy URL should contain the cache key
    expect(optimized).toContain(encodeURIComponent(`?v=${cacheKey}`));

    // When proxy strips ?v=, the upstream URL should be clean
    const proxyUrlParam = decodeURIComponent(optimized.split("url=")[1]);
    const upstreamUrl = new URL(proxyUrlParam);
    upstreamUrl.searchParams.delete("v");
    expect(upstreamUrl.toString()).toBe(original);
  });
});

describe("buildOptimizedImageUrl - proxy all external URLs", () => {
  // IMPORTANT: All external URLs are proxied to ensure we control the upstream fetch
  // and can strip ?v= cache keys that some external servers reject.
  // This prevents images from breaking on servers that don't handle unknown query params.

  it("proxies HTTPS URLs through /api/image-proxy", () => {
    const result = buildOptimizedImageUrl(
      "https://example.com/image.jpg",
      "key1"
    );
    expect(result).toMatch(/^\/api\/image-proxy\?url=/);
    expect(result).toContain("https%3A%2F%2Fexample.com");
  });

  it("proxies HTTP URLs through /api/image-proxy", () => {
    const result = buildOptimizedImageUrl(
      "http://example.com/image.jpg",
      "key1"
    );
    expect(result).toMatch(/^\/api\/image-proxy\?url=/);
    expect(result).toContain("http%3A%2F%2Fexample.com");
  });

  it("proxies protocol-relative URLs through /api/image-proxy", () => {
    const result = buildOptimizedImageUrl("//cdn.example.com/image.jpg", "key1");
    expect(result).toMatch(/^\/api\/image-proxy\?url=/);
  });

  it("does NOT proxy relative URLs (local assets)", () => {
    const result = buildOptimizedImageUrl("/static/images/logo.png", "key1");
    expect(result).not.toMatch(/^\/api\/image-proxy/);
    expect(result).toBe("/static/images/logo.png?v=key1");
  });

  it("includes cache key in proxy URL for CloudFront cache-busting", () => {
    const result = buildOptimizedImageUrl(
      "https://example.com/image.jpg",
      "version123"
    );
    expect(result).toContain("v%3Dversion123"); // ?v=version123 encoded
  });

  it("returns consistent proxy URLs for same input (hydration safe)", () => {
    const url = "https://example.com/image.jpg";
    const key = "abc";
    const result1 = buildOptimizedImageUrl(url, key);
    const result2 = buildOptimizedImageUrl(url, key);
    expect(result1).toBe(result2);
  });
});
