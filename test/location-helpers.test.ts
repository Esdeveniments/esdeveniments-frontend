import { describe, it, expect } from "vitest";
import { getNewsCta } from "@utils/location-helpers";

const newsLabels = {
  newsAll: "Notícies de Catalunya",
  newsWithPlace: "Notícies {deLabel}",
};

const getNewsCtaWithLabels = (
  place: string | undefined,
  placeLabel?: string,
  placeType?: "region" | "town"
) => getNewsCta(place, placeLabel, placeType, newsLabels);

describe("getNewsCta", () => {
  describe("basic functionality", () => {
    it("should return Catalunya news link when place is 'catalunya'", () => {
      const result = getNewsCtaWithLabels("catalunya");
      expect(result.href).toBe("/noticies");
      expect(result.text).toBe("Notícies de Catalunya");
    });

    it("should return Catalunya news link when place is empty (CRITICAL FIX)", () => {
      const result = getNewsCtaWithLabels("");
      expect(result.href).toBe("/noticies");
      expect(result.text).toBe("Notícies de Catalunya");

      // Should NOT produce "Notícies de " with dangling preposition
      expect(result.text).not.toMatch(/Notícies de\s*$/);
    });

    it("should return Catalunya news link when place is undefined (CRITICAL FIX)", () => {
      const result = getNewsCtaWithLabels(undefined);
      expect(result.href).toBe("/noticies");
      expect(result.text).toBe("Notícies de Catalunya");

      // Should NOT produce "Notícies de " with dangling preposition
      expect(result.text).not.toMatch(/Notícies de\s*$/);
    });

    it("should handle place with no label or type", () => {
      const result = getNewsCtaWithLabels("barcelona");
      expect(result.href).toBe("/noticies/barcelona");
      expect(result.text).toBe("Notícies de Barcelona");
    });
  });

  describe("with label and type", () => {
    it("should format town names without articles", () => {
      const result = getNewsCtaWithLabels("barcelona", "Barcelona", "town");
      expect(result.href).toBe("/noticies/barcelona");
      expect(result.text).toBe("Notícies de Barcelona");
    });

    it("should format region names with proper articles", () => {
      // Masculine region
      const valles = getNewsCtaWithLabels(
        "valles-oriental",
        "Vallès Oriental",
        "region"
      );
      expect(valles.href).toBe("/noticies/valles-oriental");
      expect(valles.text).toBe("Notícies del Vallès Oriental");

      // Feminine region
      const selva = getNewsCtaWithLabels("selva", "Selva", "region");
      expect(selva.href).toBe("/noticies/selva");
      expect(selva.text).toBe("Notícies de la Selva");

      // Vowel-starting region
      const emporda = getNewsCtaWithLabels(
        "alt-emporda",
        "Alt Empordà",
        "region"
      );
      expect(emporda.href).toBe("/noticies/alt-emporda");
      expect(emporda.text).toBe("Notícies de l'Alt Empordà");
    });

    it("should handle place with label but no type", () => {
      const result = getNewsCtaWithLabels("mataro", "Mataró");
      expect(result.href).toBe("/noticies/mataro");
      expect(result.text).toBe("Notícies de Mataró");
    });
  });

  describe("slug formatting", () => {
    it("should capitalize slug words when no label provided", () => {
      const result = getNewsCtaWithLabels("sant-cugat-del-valles");
      expect(result.href).toBe("/noticies/sant-cugat-del-valles");
      expect(result.text).toBe("Notícies de Sant Cugat Del Valles");
    });

    it("should handle multi-word slugs with hyphens", () => {
      const result = getNewsCtaWithLabels("l-hospitalet-de-llobregat");
      expect(result.href).toBe("/noticies/l-hospitalet-de-llobregat");
      expect(result.text).toBe("Notícies de L Hospitalet De Llobregat");
    });
  });

  describe("edge cases", () => {
    it("should handle whitespace-only place", () => {
      const result = getNewsCtaWithLabels("   ");
      expect(result.href).toBe("/noticies");
      expect(result.text).toBe("Notícies de Catalunya");
    });

    it("should preserve label capitalization", () => {
      const result = getNewsCtaWithLabels(
        "some-place",
        "Some Place Name",
        "town"
      );
      expect(result.text).toBe("Notícies de Some Place Name");
    });

    it("should handle special Catalan characters in labels", () => {
      const result = getNewsCtaWithLabels(
        "pallars-jussa",
        "Pallars Jussà",
        "region"
      );
      expect(result.text).toBe("Notícies del Pallars Jussà");
    });
  });
});
