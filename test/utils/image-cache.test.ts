import { describe, it, expect } from "vitest";
import { withImageCacheKey } from "@utils/image-cache";

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
});
