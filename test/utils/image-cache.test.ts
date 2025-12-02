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

  it("returns original URL when cache key is missing", () => {
    const url = "https://cdn.example.com/image.jpg";
    expect(withImageCacheKey(url, null)).toBe(url);
    expect(withImageCacheKey(url, undefined)).toBe(url);
  });
});


