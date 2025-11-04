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
});
