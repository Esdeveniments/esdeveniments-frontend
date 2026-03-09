import { describe, it, expect } from "vitest";
import {
  slugifySegment,
  capitalizeFirstLetter,
  extractUuidFromSlug,
  truncateString,
  normalizeForSearch,
  normalizeUrl,
  formatPlaceName,
  slug,
} from "../utils/string-helpers";

describe("slugifySegment", () => {
  it("lowercases and removes diacritics", () => {
    expect(slugifySegment("Premià de Mar")).toBe("premia-de-mar");
  });

  it("replaces non-alphanumeric with hyphens", () => {
    expect(slugifySegment("hello world!")).toBe("hello-world");
  });

  it("removes leading/trailing hyphens", () => {
    expect(slugifySegment("--test--")).toBe("test");
  });

  it("handles empty string", () => {
    expect(slugifySegment("")).toBe("");
  });

  it("handles accented characters", () => {
    expect(slugifySegment("Àlbum Exposició")).toBe("album-exposicio");
  });

  it("collapses multiple hyphens", () => {
    expect(slugifySegment("a   b   c")).toBe("a-b-c");
  });
});

describe("capitalizeFirstLetter", () => {
  it("capitalizes first letter", () => {
    expect(capitalizeFirstLetter("barcelona")).toBe("Barcelona");
  });

  it("handles empty string", () => {
    expect(capitalizeFirstLetter("")).toBe("");
  });

  it("handles single character", () => {
    expect(capitalizeFirstLetter("a")).toBe("A");
  });

  it("does not change already capitalized", () => {
    expect(capitalizeFirstLetter("Barcelona")).toBe("Barcelona");
  });
});

describe("extractUuidFromSlug", () => {
  it("extracts UUID v4 from slug", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(extractUuidFromSlug(`my-event-${uuid}`)).toBe(uuid);
  });

  it("returns last segment when no UUID", () => {
    expect(extractUuidFromSlug("my-event-123")).toBe("123");
  });

  it("handles UUID-only string", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(extractUuidFromSlug(uuid)).toBe(uuid);
  });
});

describe("truncateString", () => {
  it("returns full string if under limit", () => {
    expect(truncateString("hello", 10)).toBe("hello");
  });

  it("truncates and adds ellipsis", () => {
    expect(truncateString("hello world", 5)).toBe("hello...");
  });

  it("returns exact length string as-is", () => {
    expect(truncateString("hello", 5)).toBe("hello");
  });
});

describe("normalizeForSearch", () => {
  it("lowercases and removes accents", () => {
    expect(normalizeForSearch("Premià")).toBe("premia");
  });

  it("trims whitespace", () => {
    expect(normalizeForSearch("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(normalizeForSearch("")).toBe("");
  });

  it("handles complex Catalan text", () => {
    expect(normalizeForSearch("Exposició d'Art")).toBe("exposicio d'art");
  });
});

describe("normalizeUrl", () => {
  it("adds https:// to bare domain", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
  });

  it("adds https:// to www domain", () => {
    expect(normalizeUrl("www.example.com")).toBe("https://www.example.com");
  });

  it("keeps existing https://", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("keeps existing http://", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("returns empty for empty string", () => {
    expect(normalizeUrl("")).toBe("");
  });

  it("returns empty for whitespace", () => {
    expect(normalizeUrl("   ")).toBe("");
  });

  it("adds http:// for localhost", () => {
    expect(normalizeUrl("localhost:3000")).toBe("http://localhost:3000");
  });

  it("trims whitespace before processing", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com");
  });
});

describe("formatPlaceName", () => {
  it("capitalizes place name words", () => {
    const result = formatPlaceName("barcelona");
    expect(result).toBe("Barcelona");
  });

  it("handles empty string", () => {
    expect(formatPlaceName("")).toBe("");
  });

  it("handles hyphenated names (splits to spaces)", () => {
    const result = formatPlaceName("vilassar-de-mar");
    expect(result).toBe("Vilassar de Mar");
  });

  it("keeps particles lowercase except when first", () => {
    const result = formatPlaceName("el masnou");
    expect(result).toBe("El Masnou");
  });

  it("handles apostrophe particles", () => {
    const result = formatPlaceName("l'hospitalet");
    expect(result).toBe("L'Hospitalet");
  });

  it("handles multi-word names", () => {
    const result = formatPlaceName("santa coloma de gramenet");
    expect(result).toBe("Santa Coloma de Gramenet");
  });
});

describe("slug", () => {
  it("creates slug from title, date, and id", () => {
    const result = slug("My Event", "2026-03-09", "abc123");
    expect(result).toContain("abc123");
    expect(result).toContain("-");
  });

  it("handles empty parts gracefully", () => {
    const result = slug("test", "", "123");
    expect(result).toBeTruthy();
  });
});
