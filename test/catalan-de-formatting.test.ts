import { describe, it, expect } from "vitest";
import { formatCatalanDe } from "@utils/string-helpers";

describe("formatCatalanDe with article support", () => {
  describe("without article (original behavior)", () => {
    it("should use d' before vowels", () => {
      expect(formatCatalanDe("esport")).toBe("d'esport");
      expect(formatCatalanDe("exposicions")).toBe("d'exposicions");
    });

    it("should use de before consonants", () => {
      expect(formatCatalanDe("teatre")).toBe("de teatre");
      expect(formatCatalanDe("música")).toBe("de música");
    });

    it("should respect lowercase parameter", () => {
      expect(formatCatalanDe("Barcelona", false)).toBe("de Barcelona");
      expect(formatCatalanDe("Esport", false)).toBe("d'Esport");
    });
  });

  describe("with article (new behavior)", () => {
    it("should use 'de l'' before vowels regardless of gender", () => {
      expect(formatCatalanDe("esport", true, true)).toBe("de l'esport");
      expect(formatCatalanDe("art", true, true)).toBe("de l'art");
      expect(formatCatalanDe("humor", true, true)).toBe("de l'humor");
    });

    it("should use 'de la' before feminine consonants", () => {
      expect(formatCatalanDe("música", true, true)).toBe("de la música");
      expect(formatCatalanDe("dansa", true, true)).toBe("de la dansa");
    });

    it("should use 'del' before masculine consonants", () => {
      expect(formatCatalanDe("teatre", true, true)).toBe("del teatre");
      expect(formatCatalanDe("cinema", true, true)).toBe("del cinema");
    });

    it("should handle edge cases correctly", () => {
      expect(formatCatalanDe("gent gran", true, true)).toBe("de la gent gran");
      expect(formatCatalanDe("festivals", true, true)).toBe("dels festivals");
      expect(formatCatalanDe("tallers i formació", true, true)).toBe(
        "dels tallers i formació"
      );
    });

    it("should handle multi-word phrases by analyzing first word", () => {
      expect(formatCatalanDe("música clàssica", true, true)).toBe(
        "de la música clàssica"
      );
      expect(formatCatalanDe("concerts a l'aire lliure", true, true)).toBe(
        "dels concerts a l'aire lliure"
      );
      expect(formatCatalanDe("art contemporani", true, true)).toBe(
        "de l'art contemporani"
      );
    });

    it("should handle regions with proper articles", () => {
      expect(formatCatalanDe("Vallès Oriental", false, true, "region")).toBe(
        "del Vallès Oriental"
      );
      expect(formatCatalanDe("Selva", false, true, "region")).toBe(
        "de la Selva"
      );
      expect(formatCatalanDe("Garrotxa", false, true, "region")).toBe(
        "de la Garrotxa"
      );
      expect(formatCatalanDe("Alt Empordà", false, true, "region")).toBe(
        "de l'Alt Empordà"
      );
      expect(formatCatalanDe("Penedès", false, true, "region")).toBe(
        "del Penedès"
      ); // masculine exception
    });

    it("should handle towns without articles", () => {
      expect(formatCatalanDe("Barcelona", false, true, "town")).toBe(
        "de Barcelona"
      );
      expect(formatCatalanDe("Hospitalet", false, true, "town")).toBe(
        "d'Hospitalet"
      );
      expect(formatCatalanDe("Girona", false, true, "town")).toBe("de Girona");
    });
  });

  describe("backward compatibility", () => {
    it("should not break existing usage in location-helpers", () => {
      // This is how it's used in location-helpers.ts
      expect(formatCatalanDe("Barcelona", false)).toBe("de Barcelona");
      expect(formatCatalanDe("Andorra", false)).toBe("d'Andorra");
    });
  });
});
