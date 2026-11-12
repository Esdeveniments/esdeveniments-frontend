import { describe, it, expect } from "vitest";
import { buildEventIntroText } from "@utils/event-copy";
import en from "../messages/en.json";
import type { EventDetailResponseDTO } from "types/api/event";
import type { CitySummaryResponseDTO } from "types/api/city";
import type { RegionSummaryResponseDTO } from "types/api/event";

// Shared mock data constants
// Most tests only need a city as a placeholder, so we use Barcelona as the default
// Only tests that specifically assert the city name need different cities
const MOCK_CITIES = {
  barcelona: {
    id: 1,
    name: "Barcelona",
    slug: "barcelona",
    latitude: 41.3879,
    longitude: 2.16992,
    postalCode: "08001",
    rssFeed: null,
    enabled: true,
  } as CitySummaryResponseDTO,
  // Only needed for tests that assert the city name in output
  tona: {
    id: 4,
    name: "Tona",
    slug: "tona",
    latitude: 41.85,
    longitude: 2.22,
    postalCode: "08551",
    rssFeed: null,
    enabled: true,
  } as CitySummaryResponseDTO,
  vic: {
    id: 5,
    name: "Vic",
    slug: "vic",
    latitude: 41.93,
    longitude: 2.25,
    postalCode: "08500",
    rssFeed: null,
    enabled: true,
  } as CitySummaryResponseDTO,
  olot: {
    id: 6,
    name: "Olot",
    slug: "olot",
    latitude: 42.18,
    longitude: 2.49,
    postalCode: "17800",
    rssFeed: null,
    enabled: true,
  } as CitySummaryResponseDTO,
} as const;

const MOCK_REGIONS = {
  osona: {
    id: 1,
    name: "Osona",
    slug: "osona",
  } as RegionSummaryResponseDTO,
  vallesOriental: {
    id: 2,
    name: "Vallès Oriental",
    slug: "valles-oriental",
  } as RegionSummaryResponseDTO,
  selva: {
    id: 3,
    name: "Selva",
    slug: "selva",
  } as RegionSummaryResponseDTO,
} as const;

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
    isPromoted: false,
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
    it("should use 'a' for towns (not 'al') - the Tona bug fix", async () => {
      const event = createTestEvent({
        title: "Festa Major",
        city: MOCK_CITIES.tona,
        region: MOCK_REGIONS.osona,
      });

      const result = await buildEventIntroText(event);

      // Should be "a Tona" not "al Tona" (this was the bug)
      expect(result).toContain("a Tona");
      expect(result).not.toContain("al Tona");
      // Region should not appear when city is present (redundant)
      expect(result).not.toContain("(Osona)");
    });

    it("should use 'a' for towns starting with consonants", async () => {
      const event = createTestEvent({
        title: "Concert de Jazz",
        city: MOCK_CITIES.barcelona,
        region: undefined,
      });

      const result = await buildEventIntroText(event);

      expect(result).toContain("a Barcelona");
      expect(result).not.toContain("al Barcelona");
    });

    it("should use 'al' for masculine regions", async () => {
      const event = createTestEvent({
        title: "Caminada Popular",
        city: undefined,
        region: MOCK_REGIONS.vallesOriental,
      });

      const result = await buildEventIntroText(event);

      // Masculine region should use "al"
      expect(result).toContain("al Vallès Oriental");
    });

    it("keeps an elided town article lowercase", async () => {
      const event = createTestEvent({
        title: "Fira de la Sal",
        city: { ...MOCK_CITIES.tona, id: 99, name: "L'Escala", slug: "l-escala" },
        region: undefined,
      });

      const result = await buildEventIntroText(event);

      expect(result).toContain("a l'Escala.");
      expect(result).not.toContain("L'Escala");
    });

    it("contracts a town article with the preposition", async () => {
      const event = createTestEvent({
        title: "Concert",
        city: { ...MOCK_CITIES.tona, id: 98, name: "El Masnou", slug: "el-masnou" },
        region: undefined,
      });

      expect(await buildEventIntroText(event)).toContain("al Masnou.");
    });

    it("should use 'a la' for feminine regions", async () => {
      const event = createTestEvent({
        title: "Fira Medieval",
        city: undefined,
        region: MOCK_REGIONS.selva,
      });

      const result = await buildEventIntroText(event);

      // Feminine region should use "a la"
      expect(result).toContain("a la Selva");
    });

    it("should use 'a' for towns even when region is also present", async () => {
      const event = createTestEvent({
        title: "Mercat de Pagès",
        city: MOCK_CITIES.vic,
        region: MOCK_REGIONS.osona,
      });

      const result = await buildEventIntroText(event);

      // Should prioritize city and use "a" for the town
      expect(result).toContain("a Vic");
      expect(result).not.toContain("al Vic");
      // Region should not appear when city is present (redundant)
      expect(result).not.toContain("(Osona)");
    });

    it("should use 'a' for towns starting with vowels", async () => {
      const event = createTestEvent({
        title: "Exposició d'Art",
        city: MOCK_CITIES.olot,
        region: undefined,
        isPromoted: false,
      });

      const result = await buildEventIntroText(event);

      expect(result).toContain("a Olot");
    });
  });

  describe("title", () => {
    const intro = (title: string) =>
      buildEventIntroText(
        createTestEvent({ title, city: MOCK_CITIES.barcelona, region: undefined }),
      );

    it("quotes the title as written, with no guessed article or case change", async () => {
      expect(await intro('ALUMNAT DE BLANC DE GUIX. "Marges"')).toMatch(
        /^«ALUMNAT DE BLANC DE GUIX\. “Marges”» se celebra /,
      );
      expect(await intro("Bibliobus")).toMatch(/^«Bibliobus» se celebra /);
      expect(await intro("Taller d'urban sketching (dibuix urbà)")).toContain(
        "«Taller d'urban sketching (dibuix urbà)»",
      );
    });

    it("drops outer quotes, extra spaces and closing punctuation", async () => {
      expect(await intro('  "Marges"  ')).toMatch(/^«Marges» /);
      expect(await intro('"A" i "B"')).toMatch(/^«“A” i “B”» /);
      expect(await intro("Taller de  salut.")).toMatch(/^«Taller de salut» /);
      expect(await intro("Viatgem al Castell!")).toMatch(/^«Viatgem al Castell!» /);
    });

    it("keeps $ patterns in the title literal", async () => {
      expect(await intro("Concert $& $1")).toMatch(/^«Concert \$& \$1» /);
    });

    it("returns nothing without a title", async () => {
      expect(await intro("   ")).toBe("");
    });

    it("uses the locale's quotes and verb", async () => {
      const event = createTestEvent({ title: 'Fira "Nadal"', city: MOCK_CITIES.barcelona, region: undefined });
      expect(await buildEventIntroText(event, en.Utils.EventCopy, "en")).toMatch(
        /^“Fira ‘Nadal’” takes place /,
      );
    });

    it("keeps the English weekday capitalized and lowercases the Catalan one", async () => {
      const event = createTestEvent({
        title: "Fira",
        startDate: "2026-11-15",
        endDate: "2026-11-15",
        city: MOCK_CITIES.barcelona,
        region: undefined,
      });
      expect(await buildEventIntroText(event, en.Utils.EventCopy, "en")).toContain("on Sunday,");
      expect(await buildEventIntroText(event)).toContain("el diumenge,");
    });
  });
});
