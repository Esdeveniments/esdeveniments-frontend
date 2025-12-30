/**
 * Tests to prevent static generation count regression
 *
 * CRITICAL: These tests guard against the $307 DynamoDB cost spike incident (Dec 28, 2025).
 * If static page count grows unchecked, it increases:
 * - Build time and size (AWS Amplify 230MB limit)
 * - DynamoDB ISR cache writes
 * - Lambda cold starts during revalidation
 *
 * See: docs/incidents/2025-12-28-dynamodb-write-cost-spike.md
 * See: docs/incidents/aws-cost-optimization-analysis.md
 */
import { describe, test, expect } from "vitest";
import { topStaticGenerationPlaces } from "../utils/priority-places";
import { VALID_DATES } from "../lib/dates";
import { DEFAULT_FILTER_VALUE } from "../utils/constants";

// Maximum allowed values - increase only with explicit justification
const LIMITS = {
  MAX_STATIC_PLACES: 15, // Currently ~9, allow some growth
  MAX_STATIC_DATES: 5, // Currently 4 (excludes "tots")
  MAX_STATIC_CATEGORIES: 6, // Currently 5 (4 top + "tots")
  MAX_TOTAL_STATIC_PAGES: 500, // Currently ~261, allow headroom
};

describe("Static Generation Limits", () => {
  describe("Place Limits", () => {
    test("topStaticGenerationPlaces should not exceed limit", () => {
      expect(topStaticGenerationPlaces.length).toBeLessThanOrEqual(
        LIMITS.MAX_STATIC_PLACES
      );
    });

    test("topStaticGenerationPlaces should have expected structure", () => {
      topStaticGenerationPlaces.forEach((place) => {
        expect(typeof place).toBe("string");
        expect(place.length).toBeGreaterThan(0);
        // Slugs should be lowercase with hyphens
        expect(place).toMatch(/^[a-z0-9-]+$/);
      });
    });

    test("current places count should be documented", () => {
      // Update this when intentionally adding places
      const EXPECTED_PLACES = 9;
      expect(topStaticGenerationPlaces.length).toBe(EXPECTED_PLACES);
    });
  });

  describe("Date Limits", () => {
    test("VALID_DATES should not exceed limit", () => {
      const staticDates = VALID_DATES.filter(
        (date) => date !== DEFAULT_FILTER_VALUE
      );
      expect(staticDates.length).toBeLessThanOrEqual(LIMITS.MAX_STATIC_DATES);
    });

    test("current dates count should be documented", () => {
      // tots, avui, dema, setmana, cap-de-setmana = 5 total, 4 for static
      const staticDates = VALID_DATES.filter(
        (date) => date !== DEFAULT_FILTER_VALUE
      );
      expect(staticDates.length).toBe(4);
    });
  });

  describe("Total Static Page Calculation", () => {
    test("estimated total should not exceed limit", () => {
      const places = topStaticGenerationPlaces.length;
      const dates = VALID_DATES.filter(
        (d) => d !== DEFAULT_FILTER_VALUE
      ).length;
      const categories = 5; // 4 top categories + "tots"

      // /[place] pages
      const placePages = places;

      // /[place]/[byDate] pages: places × (dates + categories used as byDate)
      const byDatePages = places * (dates + 4); // 4 categories used as byDate param

      // /[place]/[byDate]/[category] pages: places × dates × categories
      const categoryPages = places * dates * categories;

      const totalEstimate = placePages + byDatePages + categoryPages;

      expect(totalEstimate).toBeLessThanOrEqual(LIMITS.MAX_TOTAL_STATIC_PAGES);

      // Log for visibility in test output
      console.log(`
Static Generation Estimate:
- /[place]: ${placePages} pages
- /[place]/[byDate]: ${byDatePages} pages
- /[place]/[byDate]/[category]: ${categoryPages} pages
- TOTAL: ${totalEstimate} pages (limit: ${LIMITS.MAX_TOTAL_STATIC_PAGES})
      `);
    });

    test("current total should match expected baseline", () => {
      const places = topStaticGenerationPlaces.length; // 9
      const dates = 4; // avui, dema, setmana, cap-de-setmana
      const categories = 5; // 4 top + "tots"

      // Expected calculation based on current implementation
      const expected = {
        placePages: places, // 9
        byDatePages: places * (dates + 4), // 9 * 8 = 72
        categoryPages: places * dates * categories, // 9 * 4 * 5 = 180
      };

      const total =
        expected.placePages + expected.byDatePages + expected.categoryPages;

      // Current baseline: 261 pages
      // If this test fails, update the baseline after reviewing the change
      expect(total).toBe(261);
    });
  });

  describe("Regression Guards", () => {
    test("no duplicate places in static generation list", () => {
      const uniquePlaces = new Set(topStaticGenerationPlaces);
      expect(topStaticGenerationPlaces.length).toBe(uniquePlaces.size);
    });

    test("all static places are valid slugs", () => {
      const invalidPlaces = topStaticGenerationPlaces.filter(
        (place) => !/^[a-z0-9-]+$/.test(place)
      );
      expect(invalidPlaces).toEqual([]);
    });

    test("DEFAULT_FILTER_VALUE is tots", () => {
      // This is a critical assumption in the static generation logic
      expect(DEFAULT_FILTER_VALUE).toBe("tots");
    });
  });
});

/**
 * CI INTEGRATION NOTE:
 *
 * These tests run as part of `yarn test` and will fail CI if:
 * 1. Someone adds too many places to topStaticGenerationPlaces
 * 2. The total static page count exceeds 500
 * 3. The baseline (261 pages) changes unexpectedly
 *
 * To intentionally increase limits:
 * 1. Update the LIMITS constants above
 * 2. Document the reason in the PR
 * 3. Update aws-cost-optimization-analysis.md
 */
