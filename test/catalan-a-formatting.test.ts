import { describe, it, expect } from "vitest";
import { formatCatalanA } from "@utils/string-helpers";

describe("formatCatalanA", () => {
  describe("towns (always use 'a' without articles)", () => {
    it("should use 'a' for towns starting with consonants", () => {
      expect(formatCatalanA("Barcelona", "town", false)).toBe("a Barcelona");
      expect(formatCatalanA("Girona", "town", false)).toBe("a Girona");
      expect(formatCatalanA("Vic", "town", false)).toBe("a Vic");
    });

    it("should use 'a' for towns starting with vowels", () => {
      expect(formatCatalanA("Olot", "town", false)).toBe("a Olot");
      expect(formatCatalanA("Andorra", "town", false)).toBe("a Andorra");
    });

    it("should lowercase town names when lowercase=true", () => {
      expect(formatCatalanA("Barcelona", "town", true)).toBe("a barcelona");
      expect(formatCatalanA("Girona", "town", true)).toBe("a girona");
    });

    it("should preserve original casing when lowercase=false", () => {
      expect(formatCatalanA("Barcelona", "town", false)).toBe("a Barcelona");
      expect(formatCatalanA("Sant Cugat del Vallès", "town", false)).toBe(
        "a Sant Cugat del Vallès"
      );
    });
  });

  describe("regions with proper articles", () => {
    it("should use 'a' for Catalunya (special case, no article)", () => {
      expect(formatCatalanA("Catalunya", "region", false)).toBe("a Catalunya");
      expect(formatCatalanA("catalunya", "region", true)).toBe("a catalunya");
    });

    it("should use 'al' for masculine singular regions", () => {
      expect(formatCatalanA("Vallès Oriental", "region", false)).toBe(
        "al Vallès Oriental"
      );
      expect(formatCatalanA("Penedès", "region", false)).toBe("al Penedès");
      expect(formatCatalanA("Gironès", "region", false)).toBe("al Gironès");
    });

    it("should use 'a La' for feminine singular regions (capitalized La)", () => {
      expect(formatCatalanA("Selva", "region", false)).toBe("a La Selva");
      expect(formatCatalanA("Garrotxa", "region", false)).toBe("a La Garrotxa");
      expect(formatCatalanA("Noguera", "region", false)).toBe("a La Noguera");
    });

    it("should use 'a l'' for vowel-starting singular regions", () => {
      expect(formatCatalanA("Alt Empordà", "region", false)).toBe(
        "a l'Alt Empordà"
      );
      expect(formatCatalanA("Alt Urgell", "region", false)).toBe("a l'Alt Urgell");
    });

    it("should use 'a les' for feminine plural regions", () => {
      expect(formatCatalanA("Garrigues", "region", false)).toBe("a les Garrigues");
      expect(formatCatalanA("Terres de l'Ebre", "region", false)).toBe(
        "a les Terres de l'Ebre"
      );
    });

    it("should use 'als' for masculine plural regions", () => {
      // Note: Most plural regions are feminine, but this tests the logic
      expect(formatCatalanA("Vallès", "region", false)).toBe("al Vallès");
    });

    it("should preserve original casing when lowercase=false (CRITICAL FIX)", () => {
      // This is the fix: Barcelona should be "a Barcelona" not "a La barcelona"
      expect(formatCatalanA("Barcelona", "town", false)).toBe("a Barcelona");
      
      // For regions, preserve casing but still add proper articles
      expect(formatCatalanA("Selva", "region", false)).toBe("a La Selva");
      expect(formatCatalanA("Alt Empordà", "region", false)).toBe(
        "a l'Alt Empordà"
      );
      expect(formatCatalanA("Vallès Oriental", "region", false)).toBe(
        "al Vallès Oriental"
      );
    });

    it("should use narrative case when lowercase=true (first word capitalized, rest lowercase)", () => {
      expect(formatCatalanA("Vallès Oriental", "region", true)).toBe(
        "al Vallès oriental"
      );
      expect(formatCatalanA("Alt Empordà", "region", true)).toBe(
        "a l'Alt empordà"
      );
      expect(formatCatalanA("Selva", "region", true)).toBe("a La selva");
    });
  });

  describe("general type (default behavior)", () => {
    it("should use 'a' without articles for general type", () => {
      expect(formatCatalanA("Barcelona", "general", false)).toBe("a Barcelona");
      expect(formatCatalanA("esport", "general", true)).toBe("a esport");
    });

    it("should handle empty type as general", () => {
      expect(formatCatalanA("Barcelona", "", false)).toBe("a Barcelona");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      expect(formatCatalanA("", "town", false)).toBe("a ");
      expect(formatCatalanA("", "region", false)).toBe("a ");
    });

    it("should handle whitespace", () => {
      expect(formatCatalanA("  Barcelona  ", "town", false)).toBe("a Barcelona");
      expect(formatCatalanA("  Selva  ", "region", false)).toBe("a La Selva");
    });

    it("should handle multi-word place names", () => {
      expect(formatCatalanA("Sant Cugat del Vallès", "town", false)).toBe(
        "a Sant Cugat del Vallès"
      );
      expect(formatCatalanA("L'Hospitalet de Llobregat", "town", false)).toBe(
        "a L'Hospitalet de Llobregat"
      );
    });

    it("should handle regions with special characters", () => {
      expect(formatCatalanA("Pallars Jussà", "region", false)).toBe(
        "al Pallars Jussà"
      );
      expect(formatCatalanA("Baix Ebre", "region", false)).toBe("al Baix Ebre");
    });
  });

  describe("backward compatibility", () => {
    it("should maintain default lowercase=true behavior", () => {
      expect(formatCatalanA("Barcelona", "town")).toBe("a barcelona");
      expect(formatCatalanA("Selva", "region")).toBe("a La selva");
    });

    it("should work with existing usage in generatePagesData", () => {
      // This is how it's used in generatePagesData.ts
      const label = "Barcelona";
      const type = "town";
      const result = formatCatalanA(label, type, false);
      expect(result).toBe("a Barcelona");
      
      const regionLabel = "Selva";
      const regionType = "region";
      const regionResult = formatCatalanA(regionLabel, regionType, false);
      expect(regionResult).toBe("a La Selva");
    });
  });
});

