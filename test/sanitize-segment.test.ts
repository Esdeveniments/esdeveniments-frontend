import { describe, expect, it } from "vitest";
import { sanitize, sanitizeLegacyApostrophe } from "@utils/sanitize-segment";

describe("utils/sanitize-segment sanitize()", () => {
  it("lowercases, trims, and strips diacritics", () => {
    expect(sanitize("  Hola Món  ")).toBe("hola-mon");
    expect(sanitize("Sants–Montjuïc")).toBe("sants-montjuic");
  });

  it("handles Catalan apostrophes as separators", () => {
    expect(sanitize("L'Escala")).toBe("l-escala");
    expect(sanitize("d'Igualada")).toBe("d-igualada");
  });

  it("removes Catalan middot (l·l)", () => {
    expect(sanitize("L·Escala")).toBe("lescala");
    expect(sanitize("col·legi")).toBe("collegi");
  });

  it("normalizes long dashes to hyphen", () => {
    expect(sanitize("Sants—Montjuïc")).toBe("sants-montjuic");
    expect(sanitize("Sants―Montjuïc")).toBe("sants-montjuic");
  });

  it("replaces & with ' i '", () => {
    expect(sanitize("Rock & Roll")).toBe("rock-i-roll");
  });

  it("returns 'n-a' when content cleans to empty", () => {
    expect(sanitize("###")).toBe("n-a");
  });

  it("returns empty string for empty input", () => {
    expect(sanitize("")).toBe("");
  });

  it("returns 'n-a' for whitespace-only input", () => {
    expect(sanitize("   ")).toBe("n-a");
  });
});

describe("utils/sanitize-segment sanitizeLegacyApostrophe()", () => {
  it("drops apostrophes (legacy) instead of hyphenating", () => {
    expect(sanitizeLegacyApostrophe("L'Escala")).toBe("lescala");
    expect(sanitizeLegacyApostrophe("d'Igualada")).toBe("digualada");
  });

  it("keeps other rules aligned with sanitize()", () => {
    expect(sanitizeLegacyApostrophe("Sants–Montjuïc")).toBe("sants-montjuic");
    expect(sanitizeLegacyApostrophe("Rock & Roll")).toBe("rock-i-roll");
  });
});
