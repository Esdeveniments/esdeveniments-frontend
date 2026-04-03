import { describe, it, expect } from "vitest";
import {
  generateRegionsOptions,
  generateTownsOptions,
  generateRegionsAndTownsOptions,
} from "@utils/options-helpers";
import type { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

/**
 * Fixtures that mirror the real `/api/regions/options` response shape.
 * IMPORTANT: the `slug` field is intentionally ABSENT — it is not returned
 * by `/places/regions/options`. Tests MUST pass without it.
 */
const regionsWithoutSlug: RegionsGroupedByCitiesResponseDTO[] = [
  {
    id: 1,
    name: "Alt Camp",
    cities: [
      { id: 10, value: "valls", label: "Valls", latitude: 41.286, longitude: 1.249 },
      { id: 11, value: "el-pla-de-santa-maria", label: "El Pla de Santa Maria", latitude: 41.37, longitude: 1.3 },
    ],
  },
  {
    id: 2,
    name: "Barcelonès",
    cities: [
      { id: 20, value: "barcelona", label: "Barcelona", latitude: 41.389, longitude: 2.159 },
    ],
  },
  {
    id: 3,
    name: "Vallès Occidental",
    cities: [
      { id: 30, value: "terrassa", label: "Terrassa", latitude: 41.563, longitude: 2.008 },
      { id: 31, value: "sabadell", label: "Sabadell", latitude: 41.548, longitude: 2.107 },
    ],
  },
];

/** Variant where slug IS provided (e.g., from a different endpoint). */
const regionsWithSlug: RegionsGroupedByCitiesResponseDTO[] = [
  {
    id: 1,
    name: "Alt Camp",
    slug: "alt-camp",
    cities: [
      { id: 10, value: "valls", label: "Valls", latitude: 41.286, longitude: 1.249 },
    ],
  },
];

describe("options-helpers", () => {
  // ─────────────────────────────────────────────────────────────
  // REGRESSION GUARD — this test would have caught the P0 bug
  // introduced in commit 4b6f077d where `region.slug` replaced
  // `sanitize(region.name)` but the API didn't return `slug`.
  // ─────────────────────────────────────────────────────────────
  describe("generateRegionsOptions", () => {
    it("every region option has a non-empty value even when API omits slug", () => {
      const options = generateRegionsOptions(regionsWithoutSlug);

      expect(options.length).toBe(regionsWithoutSlug.length);
      for (const option of options) {
        expect(option.value).toBeTruthy();
        expect(option.value.length).toBeGreaterThan(0);
        expect(option.placeType).toBe("region");
      }
    });

    it("produces correct slugs from region names via sanitize", () => {
      const options = generateRegionsOptions(regionsWithoutSlug);
      const byLabel = (label: string) => options.find((o) => o.label === label);

      expect(byLabel("Alt Camp")?.value).toBe("alt-camp");
      expect(byLabel("Barcelonès")?.value).toBe("barcelones");
      expect(byLabel("Vallès Occidental")?.value).toBe("valles-occidental");
    });

    it("prefers API-provided slug when available", () => {
      const options = generateRegionsOptions(regionsWithSlug);

      expect(options[0].value).toBe("alt-camp");
    });

    it("returns options sorted alphabetically by label", () => {
      const options = generateRegionsOptions(regionsWithoutSlug);
      const labels = options.map((o) => o.label);

      expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    });

    it("returns empty array for empty input", () => {
      expect(generateRegionsOptions([])).toEqual([]);
    });
  });

  describe("generateTownsOptions", () => {
    it("returns town options for a specific region", () => {
      const towns = generateTownsOptions(regionsWithoutSlug, 1);

      expect(towns.length).toBe(2);
      expect(towns.every((t) => t.placeType === "town")).toBe(true);
      expect(towns.every((t) => t.value && t.value.length > 0)).toBe(true);
    });

    it("returns empty array for unknown region ID", () => {
      expect(generateTownsOptions(regionsWithoutSlug, 999)).toEqual([]);
    });

    it("returns towns sorted alphabetically", () => {
      const towns = generateTownsOptions(regionsWithoutSlug, 1);
      const labels = towns.map((t) => t.label);

      expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    });
  });

  describe("generateRegionsAndTownsOptions", () => {
    it("first group is 'Comarques' with region options", () => {
      const groups = generateRegionsAndTownsOptions(regionsWithoutSlug);

      expect(groups[0].label).toBe("Comarques");
      expect(groups[0].options.length).toBe(regionsWithoutSlug.length);
      expect(groups[0].options.every((o) => o.placeType === "region")).toBe(true);
    });

    it("all region options have non-empty values (regression guard)", () => {
      const groups = generateRegionsAndTownsOptions(regionsWithoutSlug);
      const regionOptions = groups[0].options;

      for (const option of regionOptions) {
        expect(option.value, `Region "${option.label}" should have a non-empty value`).toBeTruthy();
      }
    });

    it("remaining groups contain town options", () => {
      const groups = generateRegionsAndTownsOptions(regionsWithoutSlug);
      const townGroups = groups.slice(1);

      expect(townGroups.length).toBe(regionsWithoutSlug.length);
      for (const group of townGroups) {
        expect(group.options.every((o) => o.placeType === "town")).toBe(true);
        expect(group.options.every((o) => o.value && o.value.length > 0)).toBe(true);
      }
    });

    it("returns empty array for null/undefined input", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(generateRegionsAndTownsOptions(null as any)).toEqual([]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(generateRegionsAndTownsOptions(undefined as any)).toEqual([]);
    });
  });
});
