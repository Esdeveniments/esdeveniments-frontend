import { describe, it, expect } from "vitest";
import {
  buildOptimizedImageUrl,
  normalizeExternalImageUrl,
  withImageCacheKey,
  isLegacyFileHandler,
} from "@utils/image-cache";

describe("isLegacyFileHandler", () => {
  describe("basic .ashx detection", () => {
    it("returns true for .ashx URLs with query params", () => {
      expect(isLegacyFileHandler("https://www.l-h.cat/utils/obreFitxer.ashx?token123")).toBe(true);
      expect(isLegacyFileHandler("https://example.com/handler.ashx?id=123")).toBe(true);
    });

    it("returns true for .ashx URLs with double slashes", () => {
      expect(isLegacyFileHandler("https://www.l-h.cat//utils/obreFitxer.ashx?token")).toBe(true);
    });

    it("returns false for .ashx URLs without query params", () => {
      expect(isLegacyFileHandler("https://example.com/handler.ashx")).toBe(false);
    });

    it("returns false for non-.ashx URLs", () => {
      expect(isLegacyFileHandler("https://example.com/image.jpg")).toBe(false);
      expect(isLegacyFileHandler("https://example.com/image.jpg?v=123")).toBe(false);
      expect(isLegacyFileHandler("https://example.com/file.aspx?id=123")).toBe(false);
    });

    it("handles real l-h.cat URLs correctly", () => {
      const realUrl = "https://www.l-h.cat//utils/obreFitxer.ashx?Fw9EVw48XS5YRqazAHeeFGClU9ldevEtNytxRsoTvXViYqazC3fYt8hthj5ogGMX7IZYKbV5EP5GTUwVAqazB";
      expect(isLegacyFileHandler(realUrl)).toBe(true);
    });
  });

  describe("case sensitivity", () => {
    it("handles uppercase .ASHX", () => {
      expect(isLegacyFileHandler("https://example.com/handler.ASHX?token")).toBe(true);
    });

    it("handles mixed case .Ashx", () => {
      expect(isLegacyFileHandler("https://example.com/handler.Ashx?token")).toBe(true);
    });
  });

  describe("long inherent cache keys", () => {
    it("returns true for URLs with long inherent cache keys", () => {
      expect(isLegacyFileHandler("https://cdn.example.com/image.jpg?abc123def456ghi789jkl012mno")).toBe(true);
    });

    it("returns false for URLs with short query params", () => {
      expect(isLegacyFileHandler("https://example.com/image.jpg?size=large")).toBe(false);
    });

    it("returns false for URLs with v= param (handled separately)", () => {
      // URLs with v= are our own cache keys, not legacy handlers
      expect(isLegacyFileHandler("https://example.com/image.jpg?v=abc123def456ghi789jkl012mno")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty query string", () => {
      expect(isLegacyFileHandler("https://example.com/handler.ashx?")).toBe(true);
    });

    it("handles query with hash fragment", () => {
      expect(isLegacyFileHandler("https://example.com/handler.ashx?token#section")).toBe(true);
    });

    it("handles protocol-relative URLs", () => {
      expect(isLegacyFileHandler("//www.l-h.cat/utils/obreFitxer.ashx?token")).toBe(true);
    });

    it("handles HTTP URLs", () => {
      expect(isLegacyFileHandler("http://www.l-h.cat/utils/obreFitxer.ashx?token")).toBe(true);
    });
  });
});

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

  describe("URLs with inherent cache-busting query params", () => {
    it("skips adding cache key for l-h.cat file handler URLs with long token", () => {
      const url =
        "https://www.l-h.cat/utils/obreFitxer.ashx?Fw9EVw48XS4qazCg7ARHmzI9k94FOqbgJ7KC1cJnjRosEBs3Fu7V3m3VpbDlqazANda6pJO9BSmcxtt7UqazB";
      const result = withImageCacheKey(url, "hash-123");
      // Should NOT append ?v= since the URL already has inherent cache key
      expect(result).toBe(url);
      expect(result).not.toContain("v=hash-123");
    });

    it("skips adding cache key for any .ashx URL with query params", () => {
      const url = "https://example.com/handler.ashx?id=123";
      const result = withImageCacheKey(url, "key");
      expect(result).toBe(url);
    });

    it("skips adding cache key for URLs with 20+ char alphanumeric query params", () => {
      const url = "https://example.com/file.ashx?token=abcdefghij1234567890xyz";
      const result = withImageCacheKey(url, "key");
      expect(result).toBe(url);
    });

    it("still adds cache key for URLs with short query params", () => {
      const url = "https://example.com/image.jpg?size=large";
      const result = withImageCacheKey(url, "key");
      expect(result).toBe("https://example.com/image.jpg?size=large&v=key");
    });

    it("preserves .ashx URLs entirely even with v= param (legacy handler)", () => {
      const url = "https://example.com/file.ashx?token=short&v=old";
      const result = withImageCacheKey(url, "new");
      // .ashx URLs are legacy handlers - don't modify them at all
      expect(result).toBe(url);
    });
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

  it("preserves double slashes for .ashx legacy handlers", () => {
    // l-h.cat requires the double slashes in the path
    const url =
      "https://www.l-h.cat//utils/obreFitxer.ashx?Fw9EVw48XS5qazC72rhPZcCS2OlbwacDKlPGuqazCOlYZ65dB5PPY8fUAcZGSSQD1FOfLWlt8G8D1MafgqazB";
    expect(normalizeExternalImageUrl(url)).toBe(url);
  });

  it("preserves triple slashes for .ashx legacy handlers", () => {
    const url = "https://www.l-h.cat///utils/obreFitxer.ashx?token";
    expect(normalizeExternalImageUrl(url)).toBe(url);
  });

  it("preserves double slashes at different path positions for .ashx", () => {
    const url = "https://example.com/path//to//handler.ashx?token";
    expect(normalizeExternalImageUrl(url)).toBe(url);
  });

  it("returns empty for invalid URL", () => {
    expect(normalizeExternalImageUrl("ht!tp://")).toBe("");
  });

  it("returns empty for overly long URLs (triggers fallback image)", () => {
    const longUrl = `https://example.com/${"a".repeat(2100)}.jpg`;
    expect(normalizeExternalImageUrl(longUrl)).toBe("");
  });

  it("handles URLs with special characters", () => {
    const url = "https://example.com/image%20with%20spaces.jpg";
    expect(normalizeExternalImageUrl(url)).toBe(url);
  });

  it("handles URLs with query params containing special chars", () => {
    const url = "https://example.com/img.jpg?name=hello%20world&size=large";
    expect(normalizeExternalImageUrl(url)).toBe(url);
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

  describe("legacy file handlers (.ashx)", () => {
    it("skips w and q params for .ashx URLs with query params", () => {
      const url =
        "https://www.l-h.cat/utils/obreFitxer.ashx?Fw9EVw48XS4qazCg7ARHmzI9k94FOqbgJ7KC1cJnjRosEBs3Fu7V3m3VpbDlqazANda6pJO9BSmcxtt7UqazB";
      const result = buildOptimizedImageUrl(url, "hash", {
        width: 700,
        quality: 50,
      });
      // Should NOT have &w= or &q= params
      expect(result).not.toContain("&w=");
      expect(result).not.toContain("&q=");
      // Should still proxy through image-proxy
      expect(result).toMatch(/^\/api\/image-proxy\?url=/);
      // Should NOT have ?v= cache key added to the original URL
      expect(decodeURIComponent(result)).not.toContain("?v=hash");
    });

    it("skips v, w, q for any .ashx handler URL", () => {
      const url = "https://example.com/handler.ashx?id=123";
      const result = buildOptimizedImageUrl(url, "key", {
        width: 500,
        quality: 75,
      });
      expect(result).not.toContain("&w=");
      expect(result).not.toContain("&q=");
      expect(decodeURIComponent(result)).not.toContain("v=key");
    });

    it("still adds w and q for normal image URLs", () => {
      const url = "https://example.com/image.jpg";
      const result = buildOptimizedImageUrl(url, "key", {
        width: 700,
        quality: 50,
      });
      expect(result).toContain("&w=700");
      expect(result).toContain("&q=50");
    });

    it("preserves double slashes in proxy URL for .ashx handlers", () => {
      const url =
        "https://www.l-h.cat//utils/obreFitxer.ashx?Fw9EVw48XS5YRqazAHeeFGClU9ldevEtNytxRsoTvXViYqazC3fYt8hthj5ogGMX7IZYKbV5EP5GTUwVAqazB";
      const result = buildOptimizedImageUrl(url, "hash", {
        width: 700,
        quality: 50,
      });
      // The decoded URL should preserve the double slash //utils/
      const decodedUrl = decodeURIComponent(result.split("url=")[1].split("&")[0]);
      expect(decodedUrl).toContain("l-h.cat//utils/");
    });

    it("preserves non-standard query strings without trailing = corruption", () => {
      // This is the critical bug: URL object serialization adds trailing "=" to
      // query params without values (e.g., ?token123 becomes ?token123=)
      // which breaks legacy ASP.NET handlers
      const url =
        "https://www.l-h.cat//utils/obreFitxer.ashx?Fw9EVw48XS5YRqazAHeeFGClU9ldevEtNytxRsoTvXViYqazC3fYt8hthj5ogGMX7IZYKbV5EP5GTUwVAqazB";
      const result = buildOptimizedImageUrl(url, null);
      const decodedUrl = decodeURIComponent(result.split("url=")[1].split("&")[0]);
      
      // Should NOT have trailing "=" added to the query string
      expect(decodedUrl).not.toMatch(/qazB=$/);
      // Should preserve exact query string
      expect(decodedUrl).toMatch(/qazB$/);
    });

    it("handles .ashx URLs with standard key=value query params", () => {
      const url = "https://example.com/handler.ashx?id=123&size=large";
      const result = buildOptimizedImageUrl(url, null);
      const decodedUrl = decodeURIComponent(result.split("url=")[1].split("&")[0]);
      
      // Standard query params should still work
      expect(decodedUrl).toContain("id=123");
      expect(decodedUrl).toContain("size=large");
    });

    it("handles uppercase .ASHX extension", () => {
      const url = "https://example.com/handler.ASHX?token123";
      const result = buildOptimizedImageUrl(url, "hash", { width: 700 });
      expect(result).not.toContain("&w=");
      expect(decodeURIComponent(result)).not.toContain("v=hash");
    });

    it("handles mixed case .Ashx extension", () => {
      const url = "https://example.com/handler.Ashx?token123";
      const result = buildOptimizedImageUrl(url, "hash", { width: 700 });
      expect(result).not.toContain("&w=");
    });

    it("handles HTTP .ashx URLs", () => {
      const url = "http://www.l-h.cat/utils/obreFitxer.ashx?token123";
      const result = buildOptimizedImageUrl(url, "hash");
      const decodedUrl = decodeURIComponent(result.split("url=")[1].split("&")[0]);
      expect(decodedUrl).not.toContain("v=hash");
      expect(decodedUrl).toContain("http://");
    });

    it("handles protocol-relative .ashx URLs", () => {
      const url = "//www.l-h.cat/utils/obreFitxer.ashx?token123";
      const result = buildOptimizedImageUrl(url, "hash");
      // Should normalize to https and still skip cache key
      expect(result).toMatch(/^\/api\/image-proxy\?url=/);
      const decodedUrl = decodeURIComponent(result.split("url=")[1].split("&")[0]);
      expect(decodedUrl).toContain("https://");
      expect(decodedUrl).not.toContain("v=hash");
    });

    it("handles .ashx URLs with hash fragments", () => {
      const url = "https://example.com/handler.ashx?token123#section";
      const result = buildOptimizedImageUrl(url, "hash");
      const decodedUrl = decodeURIComponent(result.split("url=")[1].split("&")[0]);
      expect(decodedUrl).not.toContain("v=hash");
    });

    it("handles .ashx URLs with empty query string", () => {
      const url = "https://example.com/handler.ashx?";
      const result = buildOptimizedImageUrl(url, "hash");
      const decodedUrl = decodeURIComponent(result.split("url=")[1].split("&")[0]);
      expect(decodedUrl).not.toContain("v=hash");
    });

    it("still optimizes normal images (regression check)", () => {
      const url = "https://example.com/photo.jpg";
      const result = buildOptimizedImageUrl(url, "key123", {
        width: 800,
        quality: 60,
      });
      // Should have cache key
      expect(decodeURIComponent(result)).toContain("v=key123");
      // Should have optimization params
      expect(result).toContain("&w=800");
      expect(result).toContain("&q=60");
    });

    it("still collapses double slashes for normal images (regression check)", () => {
      const url = "https://example.com//images//photo.jpg";
      const result = buildOptimizedImageUrl(url, "key");
      const decodedUrl = decodeURIComponent(result.split("url=")[1].split("&")[0]);
      // Double slashes should be collapsed for normal images
      expect(decodedUrl).not.toContain("//images//");
      expect(decodedUrl).toContain("/images/photo.jpg");
    });
  });
});

describe("hydration consistency (string-based operations)", () => {
  it("produces byte-identical output for same input (no URL object variance)", () => {
    const url =
      "https://cdn.appculturamataro.cat/medias/agenda/2025/c_crop,x_51,y_36,w_1948,h_1014/image.jpg";
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
    expect(result).toContain(
      encodeURIComponent("c_crop,x_51,y_36,w_1948,h_1014")
    );
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
    expect(result).toBe(
      "https://example.com/img.jpg?size=large&format=webp&v=v1"
    );
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
    const original =
      "https://www.cinemaesbarjo.cat/wp-content/uploads/image.jpg";
    const withKey = withImageCacheKey(original, "abc123");
    expect(withKey).toBe(
      "https://www.cinemaesbarjo.cat/wp-content/uploads/image.jpg?v=abc123"
    );

    // Simulate what the proxy does: strip ?v= before fetching upstream
    const url = new URL(withKey);
    url.searchParams.delete("v");
    const upstreamUrl = url.toString();

    expect(upstreamUrl).toBe(original);
  });

  it("stripping ?v= preserves other query params", () => {
    const withKey =
      "https://example.com/img.jpg?size=large&v=abc123&format=webp";

    const url = new URL(withKey);
    url.searchParams.delete("v");
    const upstreamUrl = url.toString();

    expect(upstreamUrl).toBe(
      "https://example.com/img.jpg?size=large&format=webp"
    );
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
    const result = buildOptimizedImageUrl(
      "//cdn.example.com/image.jpg",
      "key1"
    );
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
