import { describe, it, expect } from "vitest";
import {
  slugifySegment,
  capitalizeFirstLetter,
  extractUuidFromSlug,
  truncateString,
  normalizeForSearch,
  matchSearchToPlace,
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

describe("matchSearchToPlace", () => {
  const places = [
    { label: "Barcelona", value: "barcelona" },
    { label: "Cardedeu", value: "cardedeu" },
    { label: "Sant Vicenç de Montalt", value: "sant-vicenc-de-montalt" },
    { label: "Premià de Mar", value: "premia-de-mar" },
    { label: "Montgat", value: "montgat" },
    { label: "Catalunya", value: "catalunya" },
    { label: "Maresme", value: "maresme" },
  ];

  it("returns exact match (case-insensitive)", () => {
    expect(matchSearchToPlace("cardedeu", places)).toEqual({
      label: "Cardedeu",
      value: "cardedeu",
    });
  });

  it("returns exact match (accent-insensitive)", () => {
    expect(matchSearchToPlace("Sant Vicenç de Montalt", places)).toEqual({
      label: "Sant Vicenç de Montalt",
      value: "sant-vicenc-de-montalt",
    });
  });

  it("matches without accents (user types 'premia')", () => {
    expect(matchSearchToPlace("premia de mar", places)).toEqual({
      label: "Premià de Mar",
      value: "premia-de-mar",
    });
  });

  it("falls back to startsWith when no exact match", () => {
    expect(matchSearchToPlace("sant vicen", places)).toEqual({
      label: "Sant Vicenç de Montalt",
      value: "sant-vicenc-de-montalt",
    });
  });

  it("prefers exact match over startsWith", () => {
    const withOverlap = [
      { label: "Montgat", value: "montgat" },
      { label: "Montgat Playa", value: "montgat-playa" },
    ];
    expect(matchSearchToPlace("montgat", withOverlap)).toEqual({
      label: "Montgat",
      value: "montgat",
    });
  });

  it("returns null for empty or too-short input", () => {
    expect(matchSearchToPlace("", places)).toBeNull();
    expect(matchSearchToPlace("a", places)).toBeNull();
    expect(matchSearchToPlace("  ", places)).toBeNull();
  });

  it("requires 4+ chars for startsWith (avoids greedy prefix matches)", () => {
    // "ba" is too short for startsWith → no match (Barcelona is not an exact match for "ba")
    expect(matchSearchToPlace("ba", places)).toBeNull();
    // "bar" is still too short for startsWith
    expect(matchSearchToPlace("bar", places)).toBeNull();
    // "barc" is 4 chars → startsWith kicks in
    expect(matchSearchToPlace("barc", places)).toEqual({
      label: "Barcelona",
      value: "barcelona",
    });
  });

  it("still allows exact match at 2-3 chars", () => {
    const shortPlaces = [{ label: "Eu", value: "eu" }];
    expect(matchSearchToPlace("eu", shortPlaces)).toEqual({
      label: "Eu",
      value: "eu",
    });
  });

  it("returns null when no match", () => {
    expect(matchSearchToPlace("family trail", places)).toBeNull();
    expect(matchSearchToPlace("concerts barcelona", places)).toBeNull();
  });

  it("handles mixed case and whitespace", () => {
    expect(matchSearchToPlace("  MONTGAT  ", places)).toEqual({
      label: "Montgat",
      value: "montgat",
    });
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
