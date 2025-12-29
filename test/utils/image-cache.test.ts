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
});

describe("buildOptimizedImageUrl", () => {
  it("does not proxy HTTPS absolute URLs (performance)", () => {
    const result = buildOptimizedImageUrl("https://example.com/img.jpg", "k1");
    expect(result).toBe("https://example.com/img.jpg?v=k1");
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

    // Call multiple times - should be identical
    const result1 = withImageCacheKey(url, key);
    const result2 = withImageCacheKey(url, key);
    const result3 = buildOptimizedImageUrl(url, key);

    expect(result1).toBe(result2);
    expect(result1).toBe(result3);
    // Ensure the URL wasn't re-encoded or altered unexpectedly
    expect(result1).toBe(`${url}?v=${key}`);
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





