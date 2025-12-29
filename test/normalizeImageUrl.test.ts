import { describe, expect, it } from "vitest";
import { normalizeImageUrl } from "@components/ui/common/cardContent/normalizeImageUrl";

describe("normalizeImageUrl", () => {
  it("returns null for undefined/empty/whitespace", () => {
    expect(normalizeImageUrl(undefined)).toBeNull();
    expect(normalizeImageUrl("")).toBeNull();
    expect(normalizeImageUrl("   ")).toBeNull();
  });

  it("adds https: for protocol-relative URLs", () => {
    expect(normalizeImageUrl("//example.com/icon.png")).toBe(
      "https://example.com/icon.png"
    );
  });

  it("passes through absolute http(s) URLs", () => {
    expect(normalizeImageUrl("https://example.com/icon.png")).toBe(
      "https://example.com/icon.png"
    );
    expect(normalizeImageUrl("http://example.com/icon.png")).toBe(
      "http://example.com/icon.png"
    );
  });

  it("passes through relative root paths", () => {
    expect(normalizeImageUrl("/icons/weather.png")).toBe("/icons/weather.png");
  });

  it("returns null for unsupported formats", () => {
    expect(normalizeImageUrl("example.com/icon.png")).toBeNull();
    expect(normalizeImageUrl("ftp://example.com/icon.png")).toBeNull();
    expect(normalizeImageUrl("data:image/svg+xml;base64,AAA")).toBeNull();
  });
});
