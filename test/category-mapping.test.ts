import { describe, it, expect } from "vitest";
import {
  isValidCategorySlugFormat,
  isValidCategorySlug,
} from "../utils/category-mapping";

describe("category-mapping: isValidCategorySlugFormat", () => {
  describe("valid format", () => {
    it("accepts lowercase letters", () => {
      expect(isValidCategorySlugFormat("concerts")).toBe(true);
      expect(isValidCategorySlugFormat("teatre")).toBe(true);
      expect(isValidCategorySlugFormat("festivals")).toBe(true);
    });

    it("accepts numbers", () => {
      expect(isValidCategorySlugFormat("category123")).toBe(true);
      expect(isValidCategorySlugFormat("123")).toBe(true);
      expect(isValidCategorySlugFormat("cat1event2")).toBe(true);
    });

    it("accepts hyphens", () => {
      expect(isValidCategorySlugFormat("fires-i-festes")).toBe(true);
      expect(isValidCategorySlugFormat("cursos-i-conferencies")).toBe(true);
      expect(isValidCategorySlugFormat("cap-de-setmana")).toBe(true);
    });

    it("accepts combinations of letters, numbers, and hyphens", () => {
      expect(isValidCategorySlugFormat("category-123")).toBe(true);
      expect(isValidCategorySlugFormat("event-2024")).toBe(true);
      expect(isValidCategorySlugFormat("test-cat-1")).toBe(true);
    });

    it("accepts single character slugs", () => {
      expect(isValidCategorySlugFormat("a")).toBe(true);
      expect(isValidCategorySlugFormat("1")).toBe(true);
      expect(isValidCategorySlugFormat("-")).toBe(true);
    });

    it("accepts slugs at the default max length (64)", () => {
      const maxLengthSlug = "a".repeat(64);
      expect(isValidCategorySlugFormat(maxLengthSlug)).toBe(true);
    });

    it("accepts slugs at custom max length", () => {
      const customLengthSlug = "a".repeat(100);
      expect(isValidCategorySlugFormat(customLengthSlug, 100)).toBe(true);
    });
  });

  describe("invalid format", () => {
    it("rejects empty strings", () => {
      expect(isValidCategorySlugFormat("")).toBe(false);
    });

    it("rejects uppercase letters", () => {
      expect(isValidCategorySlugFormat("Concerts")).toBe(false);
      expect(isValidCategorySlugFormat("TEATRE")).toBe(false);
      expect(isValidCategorySlugFormat("Category")).toBe(false);
    });

    it("rejects spaces", () => {
      expect(isValidCategorySlugFormat("concerts festivals")).toBe(false);
      expect(isValidCategorySlugFormat("teatre ")).toBe(false);
      expect(isValidCategorySlugFormat(" category")).toBe(false);
    });

    it("rejects special characters", () => {
      expect(isValidCategorySlugFormat("concerts!")).toBe(false);
      expect(isValidCategorySlugFormat("teatre@festivals")).toBe(false);
      expect(isValidCategorySlugFormat("category#123")).toBe(false);
      expect(isValidCategorySlugFormat("event$")).toBe(false);
      expect(isValidCategorySlugFormat("cat%")).toBe(false);
      expect(isValidCategorySlugFormat("test&")).toBe(false);
      expect(isValidCategorySlugFormat("slug*")).toBe(false);
      expect(isValidCategorySlugFormat("cat+")).toBe(false);
      expect(isValidCategorySlugFormat("test=")).toBe(false);
      expect(isValidCategorySlugFormat("cat?")).toBe(false);
      expect(isValidCategorySlugFormat("slug/")).toBe(false);
      expect(isValidCategorySlugFormat("test\\")).toBe(false);
      expect(isValidCategorySlugFormat("cat.")).toBe(false);
      expect(isValidCategorySlugFormat("slug_")).toBe(false);
      expect(isValidCategorySlugFormat("test|")).toBe(false);
      expect(isValidCategorySlugFormat("cat[")).toBe(false);
      expect(isValidCategorySlugFormat("slug]")).toBe(false);
      expect(isValidCategorySlugFormat("test{")).toBe(false);
      expect(isValidCategorySlugFormat("cat}")).toBe(false);
    });

    it("rejects unicode characters", () => {
      expect(isValidCategorySlugFormat("categoría")).toBe(false);
      expect(isValidCategorySlugFormat("teatreñ")).toBe(false);
      expect(isValidCategorySlugFormat("festivalé")).toBe(false);
      expect(isValidCategorySlugFormat("cat中文")).toBe(false);
      expect(isValidCategorySlugFormat("театр")).toBe(false);
    });

    it("rejects slugs exceeding default max length (64)", () => {
      const tooLongSlug = "a".repeat(65);
      expect(isValidCategorySlugFormat(tooLongSlug)).toBe(false);
    });

    it("rejects slugs exceeding custom max length", () => {
      const tooLongSlug = "a".repeat(101);
      expect(isValidCategorySlugFormat(tooLongSlug, 100)).toBe(false);
    });

    it("rejects null and undefined", () => {
      expect(isValidCategorySlugFormat(null as any)).toBe(false);
      expect(isValidCategorySlugFormat(undefined as any)).toBe(false);
    });

    it("rejects non-string types", () => {
      expect(isValidCategorySlugFormat(123 as any)).toBe(false);
      expect(isValidCategorySlugFormat(true as any)).toBe(false);
      expect(isValidCategorySlugFormat({} as any)).toBe(false);
      expect(isValidCategorySlugFormat([] as any)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles leading hyphens", () => {
      expect(isValidCategorySlugFormat("-concerts")).toBe(true);
    });

    it("handles trailing hyphens", () => {
      expect(isValidCategorySlugFormat("concerts-")).toBe(true);
    });

    it("handles multiple consecutive hyphens", () => {
      expect(isValidCategorySlugFormat("concerts---festivals")).toBe(true);
    });

    it("handles only hyphens", () => {
      expect(isValidCategorySlugFormat("---")).toBe(true);
    });

    it("handles boundary length values", () => {
      expect(isValidCategorySlugFormat("a".repeat(1), 1)).toBe(true);
      expect(isValidCategorySlugFormat("a".repeat(2), 1)).toBe(false);
      expect(isValidCategorySlugFormat("a".repeat(64), 64)).toBe(true);
      expect(isValidCategorySlugFormat("a".repeat(65), 64)).toBe(false);
    });

    it("handles zero max length", () => {
      expect(isValidCategorySlugFormat("", 0)).toBe(false);
      expect(isValidCategorySlugFormat("a", 0)).toBe(false);
    });

    it("handles negative max length", () => {
      expect(isValidCategorySlugFormat("a", -1)).toBe(false);
    });
  });

  describe("real-world category examples", () => {
    it("accepts all legacy category slugs", () => {
      const legacySlugs = [
        "tots",
        "concerts",
        "festivals",
        "espectacles",
        "familia",
        "fires-i-festes",
        "exposicions",
        "esports",
        "gastronomia",
        "cursos-i-conferencies",
      ];
      legacySlugs.forEach((slug) => {
        expect(isValidCategorySlugFormat(slug)).toBe(true);
      });
    });

    it("accepts common dynamic category patterns", () => {
      const dynamicPatterns = [
        "teatre",
        "musica",
        "dansa",
        "cinema",
        "literatura",
        "art-visual",
        "fotografia",
        "escultura",
      ];
      dynamicPatterns.forEach((slug) => {
        expect(isValidCategorySlugFormat(slug)).toBe(true);
      });
    });
  });
});

describe("category-mapping: isValidCategorySlug (deprecated)", () => {
  it("accepts valid format slugs (no length limit)", () => {
    expect(isValidCategorySlug("concerts")).toBe(true);
    expect(isValidCategorySlug("fires-i-festes")).toBe(true);
    // Should accept very long slugs (no length limit)
    const veryLongSlug = "a".repeat(200);
    expect(isValidCategorySlug(veryLongSlug)).toBe(true);
  });

  it("rejects invalid format slugs", () => {
    expect(isValidCategorySlug("Concerts")).toBe(false);
    expect(isValidCategorySlug("concerts!")).toBe(false);
    expect(isValidCategorySlug("")).toBe(false);
  });

  it("maintains backward compatibility", () => {
    // Should work the same as before for valid formats
    expect(isValidCategorySlug("tots")).toBe(true);
    expect(isValidCategorySlug("teatre")).toBe(true);
    expect(isValidCategorySlug("category-123")).toBe(true);
  });
});

