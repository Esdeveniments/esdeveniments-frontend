import { describe, it, expect } from "vitest";
import {
  sanitize,
  sanitizeLegacyApostrophe,
  slug,
  extractUuidFromSlug,
  normalizeForSearch,
} from "@utils/string-helpers";

describe("sanitize()", () => {
  it("lowercases and trims", () => {
    expect(sanitize("  Hola Món  ")).toBe("hola-mon");
  });

  it("removes diacritics and symbols to ascii", () => {
    expect(sanitize("Çedilla, Ñandú!")).toBe("cedilla-nandu");
    expect(sanitize("Sants–Montjuïc")).toBe("sants-montjuic");
  });

  it("converts Catalan l·l middot to ll", () => {
    expect(sanitize("L·Escala")).toBe("lescala");
    expect(sanitize("col·legi")).toBe("collegi");
  });

  it("treats apostrophes as separators (l'escala -> l-escala)", () => {
    expect(sanitize("L'Escala")).toBe("l-escala");
    expect(sanitize("d'Igualada")).toBe("d-igualada");
  });

  it("replaces & with ' i ' (Catalan)", () => {
    expect(sanitize("Rock & Roll")).toBe("rock-i-roll");
  });

  it("drops underscores and collapses whitespace/hyphens", () => {
    expect(sanitize("foo___bar   baz")).toBe("foobar-baz");
    expect(sanitize("a-- --b")).toBe("a-b");
  });

  it("returns 'n-a' for strings that clean to empty", () => {
    expect(sanitize("###")).toBe("n-a");
  });

  it("returns empty string for empty input", () => {
    expect(sanitize("")).toBe("");
  });
});

describe("sanitizeLegacyApostrophe()", () => {
  it("drops apostrophes (legacy) instead of hyphenating", () => {
    expect(sanitizeLegacyApostrophe("L'Escala")).toBe("lescala");
    expect(sanitizeLegacyApostrophe("d'Igualada")).toBe("digualada");
  });

  it("keeps other rules identical to sanitize", () => {
    expect(sanitizeLegacyApostrophe("Sants–Montjuïc")).toBe("sants-montjuic");
    expect(sanitizeLegacyApostrophe("Rock & Roll")).toBe("rock-i-roll");
  });
});

describe("slug()", () => {
  it("builds slug from title + date + id with sanitize()", () => {
    expect(
      slug(
        "Festa Major d'Igualada",
        "17 agost 2025",
        "f9d240c2-25ae-4690-a745-f6e76e598bf3"
      )
    ).toBe(
      "festa-major-d-igualada-17-agost-2025-f9d240c2-25ae-4690-a745-f6e76e598bf3"
    );
  });

  it("trims id and ignores empty pieces", () => {
    expect(slug("", "15 febrer 2025", "  abc-123  ")).toBe(
      "15-febrer-2025-abc-123"
    );
  });
});

describe("extractUuidFromSlug()", () => {
  it("extracts UUID v4 from end of slug", () => {
    const s =
      "concert-jazz-15-febrer-2025-f9d240c2-25ae-4690-a745-f6e76e598bf3";
    expect(extractUuidFromSlug(s)).toBe(
      "f9d240c2-25ae-4690-a745-f6e76e598bf3"
    );
  });

  it("falls back to last dash segment for legacy IDs", () => {
    const s = "festa-16-juliol-2025-ea962ni7nis5ga0ppcu7n12pcg";
    expect(extractUuidFromSlug(s)).toBe("ea962ni7nis5ga0ppcu7n12pcg");
  });
});

describe("normalizeForSearch()", () => {
  it("removes accents and converts to lowercase", () => {
    expect(normalizeForSearch("Premià")).toBe("premia");
    expect(normalizeForSearch("Barcelona")).toBe("barcelona");
    expect(normalizeForSearch("Gironès")).toBe("girones");
    expect(normalizeForSearch("Lleida")).toBe("lleida");
  });

  it("handles multiple accents in a string", () => {
    expect(normalizeForSearch("Montjuïc")).toBe("montjuic");
    expect(normalizeForSearch("Àrea Metropolitana")).toBe("area metropolitana");
  });

  it("trims whitespace", () => {
    expect(normalizeForSearch("  Premià  ")).toBe("premia");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeForSearch("")).toBe("");
  });

  it("preserves spaces and other characters", () => {
    expect(normalizeForSearch("Sant Cugat")).toBe("sant cugat");
    expect(normalizeForSearch("L'Hospitalet")).toBe("l'hospitalet");
  });
});
