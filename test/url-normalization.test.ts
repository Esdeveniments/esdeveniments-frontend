import { describe, it, expect } from "vitest";
import { normalizeUrl } from "@utils/string-helpers";

describe("normalizeUrl", () => {
  it("should add https:// to URLs without protocol", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("www.example.com")).toBe("https://www.example.com");
    expect(normalizeUrl("subdomain.example.com")).toBe(
      "https://subdomain.example.com"
    );
  });

  it("should preserve existing http:// protocol", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeUrl("http://www.example.com")).toBe(
      "http://www.example.com"
    );
  });

  it("should preserve existing https:// protocol", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
    expect(normalizeUrl("https://www.example.com")).toBe(
      "https://www.example.com"
    );
  });

  it("should handle URLs with paths", () => {
    expect(normalizeUrl("example.com/path")).toBe("https://example.com/path");
    expect(normalizeUrl("example.com/path/to/page")).toBe(
      "https://example.com/path/to/page"
    );
    expect(normalizeUrl("https://example.com/path")).toBe(
      "https://example.com/path"
    );
  });

  it("should handle URLs with query parameters", () => {
    expect(normalizeUrl("example.com?param=value")).toBe(
      "https://example.com?param=value"
    );
    expect(normalizeUrl("example.com/path?param=value&other=123")).toBe(
      "https://example.com/path?param=value&other=123"
    );
  });

  it("should handle empty strings", () => {
    expect(normalizeUrl("")).toBe("");
    expect(normalizeUrl("   ")).toBe("");
  });

  it("should trim whitespace", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com");
    expect(normalizeUrl("  https://example.com  ")).toBe(
      "https://example.com"
    );
  });

  it("should handle case-insensitive protocol detection", () => {
    expect(normalizeUrl("HTTP://example.com")).toBe("HTTP://example.com");
    expect(normalizeUrl("HTTPS://example.com")).toBe("HTTPS://example.com");
    expect(normalizeUrl("Http://example.com")).toBe("Http://example.com");
  });

  it("should handle invalid input", () => {
    // @ts-expect-error - testing invalid input
    expect(normalizeUrl(null)).toBe("");
    // @ts-expect-error - testing invalid input
    expect(normalizeUrl(undefined)).toBe("");
    // @ts-expect-error - testing invalid input
    expect(normalizeUrl(123)).toBe("");
  });
});

