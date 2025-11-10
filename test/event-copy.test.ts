import { describe, it, expect } from "vitest";
import { buildEventIntroText } from "@utils/event-copy";
import type { EventDetailResponseDTO } from "types/api/event";
import type { CitySummaryResponseDTO } from "types/api/city";
import type { RegionSummaryResponseDTO } from "types/api/event";

// Helper to create minimal event fixtures
function createTestEvent(
  overrides: Partial<EventDetailResponseDTO>
): EventDetailResponseDTO {
  const defaultCity: CitySummaryResponseDTO = {
    id: 1,
    name: "Test City",
    slug: "test-city",
    latitude: 41.3851,
    longitude: 2.1734,
    postalCode: "08000",
    rssFeed: null,
    enabled: true,
  };

  const defaultRegion: RegionSummaryResponseDTO = {
    id: 1,
    name: "Test Region",
    slug: "test-region",
  };

  return {
    id: "test-id",
    hash: "test-hash",
    slug: "test-slug",
    title: "Test Event",
    type: "FREE",
    url: "https://test.com",
    description: "Test description",
    imageUrl: "https://test.com/image.jpg",
    startDate: "2025-06-15",
    startTime: null,
    endDate: "2025-06-15",
    endTime: null,
    location: "",
    visits: 0,
    origin: "MANUAL",
    city: defaultCity,
    region: defaultRegion,
    province: { id: 1, name: "Test Province", slug: "test-province" },
    categories: [],
    ...overrides,
  } as EventDetailResponseDTO;
}

describe("buildEventIntroText", () => {
  describe("preposition handling for towns and regions", () => {
    it("should use 'a' for towns (not 'al') - the Tona bug fix", () => {
      const event = createTestEvent({
        title: "Festa Major",
        city: {
          id: 1,
          name: "Tona",
          slug: "tona",
          latitude: 41.85,
          longitude: 2.22,
          postalCode: "08551",
          rssFeed: null,
          enabled: true,
        },
        region: { id: 2, name: "Osona", slug: "osona" },
      });

      const result = buildEventIntroText(event);

      // Should be "a Tona" not "al Tona" (this was the bug)
      expect(result).toContain("a Tona");
      expect(result).not.toContain("al Tona");
      // Should also include region in parentheses
      expect(result).toContain("(Osona)");
    });

    it("should use 'a' for towns starting with consonants", () => {
      const event = createTestEvent({
        title: "Concert de Jazz",
        city: {
          id: 2,
          name: "Barcelona",
          slug: "barcelona",
          latitude: 41.3879,
          longitude: 2.16992,
          postalCode: "08001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      expect(result).toContain("a Barcelona");
      expect(result).not.toContain("al Barcelona");
    });

    it("should use 'al' for masculine regions", () => {
      const event = createTestEvent({
        title: "Caminada Popular",
        city: undefined,
        region: { id: 3, name: "Vallès Oriental", slug: "valles-oriental" },
      });

      const result = buildEventIntroText(event);

      // Masculine region should use "al"
      expect(result).toContain("al Vallès oriental");
    });

    it("should use 'a la' for feminine regions", () => {
      const event = createTestEvent({
        title: "Fira Medieval",
        city: undefined,
        region: { id: 4, name: "Selva", slug: "selva" },
      });

      const result = buildEventIntroText(event);

      // Feminine region should use "a la"
      expect(result).toContain("a La selva");
    });

    it("should use 'a' for towns even when region is also present", () => {
      const event = createTestEvent({
        title: "Mercat de Pagès",
        city: {
          id: 5,
          name: "Vic",
          slug: "vic",
          latitude: 41.93,
          longitude: 2.25,
          postalCode: "08500",
          rssFeed: null,
          enabled: true,
        },
        region: { id: 6, name: "Osona", slug: "osona" },
      });

      const result = buildEventIntroText(event);

      // Should prioritize city and use "a" for the town
      expect(result).toContain("a Vic");
      expect(result).not.toContain("al Vic");
      // Should also include region in parentheses
      expect(result).toContain("(Osona)");
    });

    it("should use 'a' for towns starting with vowels", () => {
      const event = createTestEvent({
        title: "Exposició d'Art",
        city: {
          id: 7,
          name: "Olot",
          slug: "olot",
          latitude: 42.18,
          longitude: 2.49,
          postalCode: "17800",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
        type: "PAID",
      });

      const result = buildEventIntroText(event);

      expect(result).toContain("a Olot");
    });
  });

  describe("article detection for event titles", () => {
    it("should detect plural titles and use correct verb form", () => {
      const event = createTestEvent({
        title: "Les Fires de Sant Miquel",
        startDate: "2025-09-29",
        endDate: "2025-09-29",
        city: {
          id: 8,
          name: "Lleida",
          slug: "lleida",
          latitude: 41.62,
          longitude: 0.63,
          postalCode: "25001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Plural title should use "se celebren"
      expect(result).toContain("se celebren");
      expect(result).not.toContain("se celebra");
    });

    it("should detect singular titles and use correct verb form", () => {
      const event = createTestEvent({
        title: "El Festival de Música",
        startDate: "2025-07-01",
        endDate: "2025-07-03",
        city: {
          id: 9,
          name: "Girona",
          slug: "girona",
          latitude: 41.98,
          longitude: 2.82,
          postalCode: "17001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
        type: "PAID",
      });

      const result = buildEventIntroText(event);

      // Singular title should use "se celebra"
      expect(result).toContain("se celebra");
      expect(result).not.toContain("se celebren");
    });
  });

  describe("parentheses capitalization with backslashes", () => {
    it("should title-case content inside parentheses even with backslashes", () => {
      const event = createTestEvent({
        title: "Fira d'artesania",
        city: {
          id: 10,
          name: "Foo",
          slug: "foo",
          latitude: 41.0,
          longitude: 2.0,
          postalCode: "00000",
          rssFeed: null,
          enabled: true,
        },
        region: { id: 11, name: "test\\data", slug: "test-data" },
      });

      const result = buildEventIntroText(event);

      // Parentheses text should be title-cased even with a backslash
      expect(result).toContain("(Test\\data)");
    });
  });

  describe("article gender validation and correction", () => {
    it("should correct wrong masculine plural article to feminine plural", () => {
      const event = createTestEvent({
        title: "Els festes d'aniversari",
        startDate: "2025-11-09",
        endDate: undefined,
        city: {
          id: 12,
          name: "Barcelona",
          slug: "barcelona",
          latitude: 41.3879,
          longitude: 2.16992,
          postalCode: "08001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should correct "Els festes" to "Les festes" (first word is lowercase)
      expect(result).toContain("Les festes");
      expect(result).not.toContain("Els festes");
      // Should use plural verb
      expect(result).toContain("se celebren");
    });

    it("should correct wrong feminine article to masculine", () => {
      const event = createTestEvent({
        title: "La festival de música",
        startDate: "2025-07-15",
        endDate: undefined,
        city: {
          id: 13,
          name: "Girona",
          slug: "girona",
          latitude: 41.98,
          longitude: 2.82,
          postalCode: "17001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should correct "La festival" to "El festival" (first word is lowercase)
      expect(result).toContain("El festival");
      expect(result).not.toContain("La festival");
      // Should use singular verb
      expect(result).toContain("se celebra");
    });

    it("should correct wrong singular article to plural", () => {
      const event = createTestEvent({
        title: "El fires de Sant Miquel",
        startDate: "2025-09-29",
        endDate: undefined,
        city: {
          id: 14,
          name: "Lleida",
          slug: "lleida",
          latitude: 41.62,
          longitude: 0.63,
          postalCode: "25001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should correct "El fires" to "Les fires" (plural feminine, first word lowercase)
      expect(result).toContain("Les fires");
      expect(result).not.toContain("El fires");
      // Should use plural verb
      expect(result).toContain("se celebren");
    });

    it("should keep correct article when it matches the noun", () => {
      const event = createTestEvent({
        title: "Les festes de Tardor",
        startDate: "2025-11-14",
        endDate: undefined,
        city: {
          id: 15,
          name: "Vilassar de Mar",
          slug: "vilassar-de-mar",
          latitude: 41.5,
          longitude: 2.4,
          postalCode: "08340",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should keep "Les festes" as it's correct (first word is lowercase)
      expect(result).toContain("Les festes");
      expect(result).not.toContain("Els festes");
      expect(result).toContain("se celebren");
    });

    it("should handle L' article correctly", () => {
      const event = createTestEvent({
        title: "L'activitat cultural",
        startDate: "2025-06-20",
        endDate: undefined,
        city: {
          id: 16,
          name: "Barcelona",
          slug: "barcelona",
          latitude: 41.3879,
          longitude: 2.16992,
          postalCode: "08001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should keep "L'activitat" as it's correct for vowel-starting feminine noun (first word is lowercase)
      expect(result).toContain("L'activitat");
      expect(result).not.toContain("La activitat");
      expect(result).toContain("se celebra");
    });
  });

  describe("Roman numeral handling", () => {
    it("should handle Roman numeral at start of title and capitalize it", () => {
      const event = createTestEvent({
        title: "ii fira animalista del Masnou",
        startDate: "2025-11-09",
        endDate: undefined,
        city: {
          id: 17,
          name: "El Masnou",
          slug: "el-masnou",
          latitude: 41.48,
          longitude: 2.32,
          postalCode: "08320",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should use "La" article, capitalize Roman numeral, and keep next word lowercase
      expect(result).toContain("La II fira");
      expect(result).not.toContain("ii fira");
      expect(result).not.toContain("L'ii");
      expect(result).toContain("se celebra");
    });

    it("should correct L' article before Roman numeral to La", () => {
      const event = createTestEvent({
        title: "L'ii fira animalista del Masnou",
        startDate: "2025-11-09",
        endDate: undefined,
        city: {
          id: 18,
          name: "El Masnou",
          slug: "el-masnou",
          latitude: 41.48,
          longitude: 2.32,
          postalCode: "08320",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should correct "L'ii" to "La II" and keep next word lowercase
      expect(result).toContain("La II fira");
      expect(result).not.toContain("L'ii");
      expect(result).not.toContain("L'II");
      expect(result).toContain("se celebra");
    });

    it("should handle lowercase Roman numeral and capitalize it", () => {
      const event = createTestEvent({
        title: "iii edició del festival",
        startDate: "2025-08-15",
        endDate: undefined,
        city: {
          id: 19,
          name: "Girona",
          slug: "girona",
          latitude: 41.98,
          longitude: 2.82,
          postalCode: "17001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should use "La" (edició is feminine), capitalize Roman numeral to "III", and keep next word lowercase
      expect(result).toContain("La III edició");
      expect(result).not.toContain("iii");
      expect(result).toContain("se celebra");
    });

    it("should handle Roman numeral with correct article already present", () => {
      const event = createTestEvent({
        title: "La II Fira Animalista",
        startDate: "2025-11-09",
        endDate: undefined,
        city: {
          id: 20,
          name: "El Masnou",
          slug: "el-masnou",
          latitude: 41.48,
          longitude: 2.32,
          postalCode: "08320",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should keep "La II fira" as it's already correct (Roman numeral capitalized, word lowercase)
      expect(result).toContain("La II fira");
      expect(result).toContain("se celebra");
    });

    it("should handle single Roman numeral I", () => {
      const event = createTestEvent({
        title: "i jornada de poesia",
        startDate: "2025-05-10",
        endDate: undefined,
        city: {
          id: 21,
          name: "Barcelona",
          slug: "barcelona",
          latitude: 41.3879,
          longitude: 2.16992,
          postalCode: "08001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should use "La", capitalize Roman numeral to "I", and keep next word lowercase
      expect(result).toContain("La I jornada");
      expect(result).not.toContain("i jornada");
      expect(result).toContain("se celebra");
    });

    it("should handle Roman numeral not at the start of title", () => {
      const event = createTestEvent({
        title: "Fira de la II edició",
        startDate: "2025-09-20",
        endDate: undefined,
        city: {
          id: 22,
          name: "Barcelona",
          slug: "barcelona",
          latitude: 41.3879,
          longitude: 2.16992,
          postalCode: "08001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should detect "fira" as the first word and use "La fira" (lowercase)
      expect(result).toContain("La fira");
      // Roman numeral in the middle should remain as is (not capitalized by our logic)
      expect(result).toContain("se celebra");
    });

    it("should use masculine article for Roman numeral with masculine noun", () => {
      const event = createTestEvent({
        title: "xx campionat de parxís",
        startDate: "2025-08-16",
        endDate: undefined,
        city: {
          id: 23,
          name: "Ullastrell",
          slug: "ullastrell",
          latitude: 41.52,
          longitude: 1.96,
          postalCode: "08231",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should use "El" (campionat is masculine), not "La"
      expect(result).toContain("El XX campionat");
      expect(result).not.toContain("La XX campionat");
      expect(result).toContain("se celebra");
    });

    it("should detect feminine noun 'nit' correctly", () => {
      const event = createTestEvent({
        title: "la nit jove",
        startDate: "2025-08-15",
        endDate: undefined,
        city: {
          id: 24,
          name: "Ullastrell",
          slug: "ullastrell",
          latitude: 41.52,
          longitude: 1.96,
          postalCode: "08231",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should use "La" (nit is feminine), not "El"
      expect(result).toContain("La nit");
      expect(result).not.toContain("El nit");
      expect(result).toContain("se celebra");
    });

    it("should detect other feminine nouns without typical endings", () => {
      const event = createTestEvent({
        title: "la llum de la ciutat",
        startDate: "2025-08-20",
        endDate: undefined,
        city: {
          id: 25,
          name: "Barcelona",
          slug: "barcelona",
          latitude: 41.3879,
          longitude: 2.16992,
          postalCode: "08001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should use "La" (llum is feminine)
      expect(result).toContain("La llum");
      expect(result).not.toContain("El llum");
      expect(result).toContain("se celebra");
    });

    it("should use plural verb for plural titles starting with Roman numeral", () => {
      const event = createTestEvent({
        title: "xx festes majors",
        startDate: "2025-07-15",
        endDate: undefined,
        city: {
          id: 26,
          name: "Girona",
          slug: "girona",
          latitude: 41.98,
          longitude: 2.82,
          postalCode: "17001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should use "Les" (festes is plural feminine) and "se celebren" (plural verb)
      expect(result).toContain("Les XX festes");
      expect(result).toContain("se celebren");
      expect(result).not.toContain("se celebra");
    });

    it("should handle singular words ending in accented -s (e.g., 'Congrés')", () => {
      // Test case: "Congrés" (congress, singular masculine)
      // Words ending in accented -s are singular, not plural, so they should not trigger
      // plural detection logic. After normalization, "congrés" becomes "congres" which ends
      // in "s", but we should detect it as singular masculine, not plural.
      const event = createTestEvent({
        title: "XVIII Congrés de Música",
        startDate: "2025-07-15",
        endDate: undefined,
        city: {
          id: 30,
          name: "Barcelona",
          slug: "barcelona",
          latitude: 41.3879,
          longitude: 2.16992,
          postalCode: "08001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should use "El" (congrés is singular masculine) and "se celebra" (singular verb)
      expect(result).toContain("El XVIII congrés");
      expect(result).toContain("se celebra");
      expect(result).not.toContain("Les XVIII congrés");
      expect(result).not.toContain("se celebren");
    });
  });

  describe("plural detection logic (conservative stem checking)", () => {
    it("should check stem first before adding 'a' for words ending in 'es'", () => {
      // This test validates Fix 2: the logic checks if the stem alone is already
      // clearly feminine before trying to add "a". This prevents incorrect
      // transformations while still handling cases like "festes" → "festa".

      // Test case: "festes" (festivals)
      // - Stem: "fest" → not clearly feminine (defaults to masculine)
      // - Stem + "a": "festa" → feminine
      // - Should correctly identify as plural feminine
      const event = createTestEvent({
        title: "festes populars",
        startDate: "2025-08-15",
        endDate: undefined,
        city: {
          id: 27,
          name: "Barcelona",
          slug: "barcelona",
          latitude: 41.3879,
          longitude: 2.16992,
          postalCode: "08001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should correctly identify "festes" as plural feminine
      expect(result).toContain("Les festes");
      expect(result).toContain("se celebren");
      expect(result).not.toContain("Els festes");
      expect(result).not.toContain("se celebra");
    });

    it("should handle plural words ending in 'es' with stem-first checking", () => {
      // Additional test to ensure the conservative approach works for various cases
      const event = createTestEvent({
        title: "fires de Sant Miquel",
        startDate: "2025-09-29",
        endDate: undefined,
        city: {
          id: 28,
          name: "Lleida",
          slug: "lleida",
          latitude: 41.62,
          longitude: 0.63,
          postalCode: "25001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // "fires" stem is "fire" (not clearly feminine), adding "a" gives "firea" (feminine)
      // Should correctly identify as plural feminine
      expect(result).toContain("Les fires");
      expect(result).toContain("se celebren");
      expect(result).not.toContain("Els fires");
      expect(result).not.toContain("se celebra");
    });

    it("should keep masculine plural words masculine (e.g., 'pares' from 'pare')", () => {
      // Test case: "pares" (parents, plural of "pare" which is masculine)
      // - Stem: "par" → detected as masculine (default)
      // - Should NOT try to add "a" to make it "para" (feminine)
      // - Should correctly identify as plural masculine → "Els pares"
      const event = createTestEvent({
        title: "Pares musicals",
        startDate: "2025-08-15",
        endDate: undefined,
        city: {
          id: 29,
          name: "Barcelona",
          slug: "barcelona",
          latitude: 41.3879,
          longitude: 2.16992,
          postalCode: "08001",
          rssFeed: null,
          enabled: true,
        },
        region: undefined,
      });

      const result = buildEventIntroText(event);

      // Should correctly identify "pares" as plural masculine
      expect(result).toContain("Els pares");
      expect(result).toContain("se celebren");
      expect(result).not.toContain("Les pares");
      expect(result).not.toContain("se celebra");
    });
  });
});
