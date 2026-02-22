/**
 * Unit tests for the sponsor banner system.
 * Tests the core logic: date filtering, place matching, and geo scope handling.
 *
 * @see /strategy-pricing.md for system documentation
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { SponsorConfig } from "types/sponsor";
import {
  buildLineItemParams,
  buildCustomFieldParams,
  buildMetadataParams,
} from "lib/stripe/checkout-helpers";
import { MS_PER_DAY } from "utils/constants";

// Mock the sponsors array to test the logic without affecting production data
const createMockSponsorModule = (sponsors: SponsorConfig[]) => {
  function getTodayUtc() {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  function isSponsorActive(sponsor: SponsorConfig, date: Date) {
    const startDate = new Date(`${sponsor.startDate}T00:00:00.000Z`);
    const endDate = new Date(`${sponsor.endDate}T23:59:59.999Z`);
    return date >= startDate && date <= endDate;
  }

  function getRemainingDays(sponsor: SponsorConfig, todayUtc: Date) {
    const endDateUtc = new Date(`${sponsor.endDate}T00:00:00.000Z`);
    const diffDays = Math.floor(
      (endDateUtc.getTime() - todayUtc.getTime()) / MS_PER_DAY,
    );
    return Math.max(1, diffDays + 1);
  }

  // Replicate the exact logic from config/sponsors.ts (UTC-based)
  // Now supports fallback cascade for event pages
  function getActiveSponsorForPlace(
    place: string,
    fallbackPlaces?: string[],
  ): { sponsor: SponsorConfig; matchedPlace: string } | null {
    const today = getTodayUtc();

    // Try primary place first
    for (const sponsor of sponsors) {
      if (sponsor.places.includes(place) && isSponsorActive(sponsor, today)) {
        return { sponsor, matchedPlace: place };
      }
    }

    // Try fallback places in order (region → country)
    if (fallbackPlaces) {
      for (const fallback of fallbackPlaces) {
        if (fallback) {
          for (const sponsor of sponsors) {
            if (
              sponsor.places.includes(fallback) &&
              isSponsorActive(sponsor, today)
            ) {
              return { sponsor, matchedPlace: fallback };
            }
          }
        }
      }
    }

    return null;
  }

  function hasSponsorConfigForPlace(place: string) {
    return sponsors.some((sponsor) => sponsor.places.includes(place));
  }

  function getAllActiveSponsors() {
    const today = getTodayUtc();

    return sponsors.filter((sponsor) => isSponsorActive(sponsor, today));
  }

  function getOccupiedPlaceStatus() {
    const today = getTodayUtc();
    const status = new Map<string, number>();

    for (const sponsor of sponsors) {
      if (!isSponsorActive(sponsor, today)) {
        continue;
      }

      const remainingDays = getRemainingDays(sponsor, today);
      for (const place of sponsor.places) {
        if (!status.has(place)) {
          status.set(place, remainingDays);
        }
      }
    }

    return status;
  }

  return {
    getActiveSponsorForPlace,
    hasSponsorConfigForPlace,
    getAllActiveSponsors,
    getRemainingDays,
    getOccupiedPlaceStatus,
  };
};

describe("Sponsor System", () => {
  describe("getActiveSponsorForPlace", () => {
    beforeEach(() => {
      // Set a fixed date for consistent testing: 2026-01-15 (UTC)
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test("returns null when no sponsors configured", () => {
      const { getActiveSponsorForPlace } = createMockSponsorModule([]);
      expect(getActiveSponsorForPlace("barcelona")).toBeNull();
    });

    test("returns null when place has no sponsor", () => {
      const sponsors: SponsorConfig[] = [
        {
          businessName: "Test Business",
          imageUrl: "https://example.com/banner.jpg",
          targetUrl: "https://example.com",
          places: ["mataro"],
          geoScope: "town",
          startDate: "2026-01-01",
          endDate: "2026-01-31",
        },
      ];
      const { getActiveSponsorForPlace } = createMockSponsorModule(sponsors);

      expect(getActiveSponsorForPlace("barcelona")).toBeNull();
    });

    test("returns sponsor when place matches and date is within range", () => {
      const sponsor: SponsorConfig = {
        businessName: "Matching Business",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["barcelona"],
        geoScope: "town",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([sponsor]);

      const result = getActiveSponsorForPlace("barcelona");
      expect(result).not.toBeNull();
      expect(result?.sponsor.businessName).toBe("Matching Business");
      expect(result?.matchedPlace).toBe("barcelona");
    });

    test("returns null when sponsor is expired (end date passed)", () => {
      const expiredSponsor: SponsorConfig = {
        businessName: "Expired Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["barcelona"],
        geoScope: "town",
        startDate: "2026-01-01",
        endDate: "2026-01-10", // Before the fixed date of 2026-01-15
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([
        expiredSponsor,
      ]);

      expect(getActiveSponsorForPlace("barcelona")).toBeNull();
    });

    test("returns null when sponsor has not started yet", () => {
      const futureSponsor: SponsorConfig = {
        businessName: "Future Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["barcelona"],
        geoScope: "town",
        startDate: "2026-01-20", // After the fixed date of 2026-01-15
        endDate: "2026-01-31",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([
        futureSponsor,
      ]);

      expect(getActiveSponsorForPlace("barcelona")).toBeNull();
    });

    test("includes sponsor on exact start date", () => {
      const sponsor: SponsorConfig = {
        businessName: "Start Day Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["barcelona"],
        geoScope: "town",
        startDate: "2026-01-15", // Exact match with fixed date
        endDate: "2026-01-31",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([sponsor]);

      const result = getActiveSponsorForPlace("barcelona");
      expect(result).not.toBeNull();
      expect(result?.sponsor.businessName).toBe("Start Day Sponsor");
    });

    test("includes sponsor on exact end date", () => {
      const sponsor: SponsorConfig = {
        businessName: "End Day Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["barcelona"],
        geoScope: "town",
        startDate: "2026-01-01",
        endDate: "2026-01-15", // Exact match with fixed date
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([sponsor]);

      const result = getActiveSponsorForPlace("barcelona");
      expect(result).not.toBeNull();
      expect(result?.sponsor.businessName).toBe("End Day Sponsor");
    });

    test("returns first matching sponsor when multiple match (first-match-wins)", () => {
      const sponsors: SponsorConfig[] = [
        {
          businessName: "First Sponsor",
          imageUrl: "https://example.com/first.jpg",
          targetUrl: "https://first.example.com",
          places: ["barcelona"],
          geoScope: "town",
          startDate: "2026-01-01",
          endDate: "2026-01-31",
        },
        {
          businessName: "Second Sponsor",
          imageUrl: "https://example.com/second.jpg",
          targetUrl: "https://second.example.com",
          places: ["barcelona"],
          geoScope: "town",
          startDate: "2026-01-01",
          endDate: "2026-01-31",
        },
      ];
      const { getActiveSponsorForPlace } = createMockSponsorModule(sponsors);

      const result = getActiveSponsorForPlace("barcelona");
      expect(result?.sponsor.businessName).toBe("First Sponsor");
    });

    test("matches place from multiple places array", () => {
      const sponsor: SponsorConfig = {
        businessName: "Multi-place Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["barcelona", "gracia", "sants"],
        geoScope: "town",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([sponsor]);

      expect(getActiveSponsorForPlace("gracia")?.sponsor.businessName).toBe(
        "Multi-place Sponsor",
      );
      expect(getActiveSponsorForPlace("sants")?.sponsor.businessName).toBe(
        "Multi-place Sponsor",
      );
      expect(getActiveSponsorForPlace("barcelona")?.sponsor.businessName).toBe(
        "Multi-place Sponsor",
      );
    });
  });

  describe("Cascade Logic (Event Pages)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test("returns town sponsor when town has sponsor (no fallback needed)", () => {
      const townSponsor: SponsorConfig = {
        businessName: "Town Sponsor",
        imageUrl: "https://example.com/town.jpg",
        targetUrl: "https://town.example.com",
        places: ["cardedeu"],
        geoScope: "town",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const regionSponsor: SponsorConfig = {
        businessName: "Region Sponsor",
        imageUrl: "https://example.com/region.jpg",
        targetUrl: "https://region.example.com",
        places: ["valles-oriental"],
        geoScope: "region",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([
        townSponsor,
        regionSponsor,
      ]);

      // Town sponsor wins even with fallbacks
      const result = getActiveSponsorForPlace("cardedeu", [
        "valles-oriental",
        "catalunya",
      ]);
      expect(result?.sponsor.businessName).toBe("Town Sponsor");
      expect(result?.matchedPlace).toBe("cardedeu");
    });

    test("falls back to region when town has no sponsor", () => {
      const regionSponsor: SponsorConfig = {
        businessName: "Region Sponsor",
        imageUrl: "https://example.com/region.jpg",
        targetUrl: "https://region.example.com",
        places: ["valles-oriental"],
        geoScope: "region",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([
        regionSponsor,
      ]);

      // No town sponsor for cardedeu, falls back to region
      const result = getActiveSponsorForPlace("cardedeu", [
        "valles-oriental",
        "catalunya",
      ]);
      expect(result?.sponsor.businessName).toBe("Region Sponsor");
      expect(result?.matchedPlace).toBe("valles-oriental");
    });

    test("falls back to country when neither town nor region has sponsor", () => {
      const countrySponsor: SponsorConfig = {
        businessName: "Country Sponsor",
        imageUrl: "https://example.com/country.jpg",
        targetUrl: "https://country.example.com",
        places: ["catalunya"],
        geoScope: "country",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([
        countrySponsor,
      ]);

      // No town or region sponsor, falls back to country
      const result = getActiveSponsorForPlace("cardedeu", [
        "valles-oriental",
        "catalunya",
      ]);
      expect(result?.sponsor.businessName).toBe("Country Sponsor");
      expect(result?.matchedPlace).toBe("catalunya");
    });

    test("returns null when no sponsors at any level", () => {
      const { getActiveSponsorForPlace } = createMockSponsorModule([]);

      const result = getActiveSponsorForPlace("cardedeu", [
        "valles-oriental",
        "catalunya",
      ]);
      expect(result).toBeNull();
    });

    test("respects cascade order: town → region → country", () => {
      const townSponsor: SponsorConfig = {
        businessName: "Town Sponsor",
        imageUrl: "https://example.com/town.jpg",
        targetUrl: "https://town.example.com",
        places: ["cardedeu"],
        geoScope: "town",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const regionSponsor: SponsorConfig = {
        businessName: "Region Sponsor",
        imageUrl: "https://example.com/region.jpg",
        targetUrl: "https://region.example.com",
        places: ["valles-oriental"],
        geoScope: "region",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const countrySponsor: SponsorConfig = {
        businessName: "Country Sponsor",
        imageUrl: "https://example.com/country.jpg",
        targetUrl: "https://country.example.com",
        places: ["catalunya"],
        geoScope: "country",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([
        townSponsor,
        regionSponsor,
        countrySponsor,
      ]);

      // All three active: town wins
      expect(
        getActiveSponsorForPlace("cardedeu", ["valles-oriental", "catalunya"])
          ?.sponsor.businessName,
      ).toBe("Town Sponsor");

      // No town sponsor for different town: region wins
      expect(
        getActiveSponsorForPlace("la-garriga", ["valles-oriental", "catalunya"])
          ?.sponsor.businessName,
      ).toBe("Region Sponsor");

      // No town or region sponsor: country wins
      expect(
        getActiveSponsorForPlace("girona", ["girones", "catalunya"])?.sponsor
          .businessName,
      ).toBe("Country Sponsor");
    });

    test("handles empty fallbackPlaces array", () => {
      const sponsor: SponsorConfig = {
        businessName: "Town Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["barcelona"],
        geoScope: "town",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([sponsor]);

      // With empty fallbacks, behaves like no fallbacks
      expect(
        getActiveSponsorForPlace("barcelona", [])?.sponsor.businessName,
      ).toBe("Town Sponsor");
      expect(getActiveSponsorForPlace("girona", [])).toBeNull();
    });

    test("handles undefined fallbackPlaces", () => {
      const sponsor: SponsorConfig = {
        businessName: "Town Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["barcelona"],
        geoScope: "town",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([sponsor]);

      // Without fallbacks, only checks primary place
      expect(getActiveSponsorForPlace("barcelona")?.sponsor.businessName).toBe(
        "Town Sponsor",
      );
      expect(getActiveSponsorForPlace("girona")).toBeNull();
    });
  });

  describe("Geo Scope Tiers", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test("town-level sponsor only shows for specific town", () => {
      const sponsor: SponsorConfig = {
        businessName: "Town Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["mataro"],
        geoScope: "town",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([sponsor]);

      expect(getActiveSponsorForPlace("mataro")).not.toBeNull();
      expect(getActiveSponsorForPlace("maresme")).toBeNull();
      expect(getActiveSponsorForPlace("catalunya")).toBeNull();
    });

    test("region-level sponsor shows for region slug", () => {
      const sponsor: SponsorConfig = {
        businessName: "Region Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["maresme"],
        geoScope: "region",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([sponsor]);

      expect(getActiveSponsorForPlace("maresme")).not.toBeNull();
      expect(getActiveSponsorForPlace("mataro")).toBeNull();
    });

    test("country-level sponsor shows for catalunya", () => {
      const sponsor: SponsorConfig = {
        businessName: "Country Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["catalunya"],
        geoScope: "country",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([sponsor]);

      expect(getActiveSponsorForPlace("catalunya")).not.toBeNull();
      expect(getActiveSponsorForPlace("barcelona")).toBeNull();
    });
  });

  describe("hasSponsorConfigForPlace", () => {
    test("returns false when no sponsors configured", () => {
      const { hasSponsorConfigForPlace } = createMockSponsorModule([]);
      expect(hasSponsorConfigForPlace("barcelona")).toBe(false);
    });

    test("returns true when sponsor exists for place (regardless of date)", () => {
      const expiredSponsor: SponsorConfig = {
        businessName: "Expired Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["barcelona"],
        geoScope: "town",
        startDate: "2020-01-01",
        endDate: "2020-01-31", // Long expired
      };
      const { hasSponsorConfigForPlace } = createMockSponsorModule([
        expiredSponsor,
      ]);

      // Should return true even for expired sponsors (for analytics/debugging)
      expect(hasSponsorConfigForPlace("barcelona")).toBe(true);
    });

    test("returns false when place has no sponsor config", () => {
      const sponsor: SponsorConfig = {
        businessName: "Test Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["mataro"],
        geoScope: "town",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };
      const { hasSponsorConfigForPlace } = createMockSponsorModule([sponsor]);

      expect(hasSponsorConfigForPlace("barcelona")).toBe(false);
    });
  });

  describe("getAllActiveSponsors", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test("returns empty array when no sponsors", () => {
      const { getAllActiveSponsors } = createMockSponsorModule([]);
      expect(getAllActiveSponsors()).toEqual([]);
    });

    test("returns only active sponsors, filtering expired ones", () => {
      const sponsors: SponsorConfig[] = [
        {
          businessName: "Active Sponsor",
          imageUrl: "https://example.com/active.jpg",
          targetUrl: "https://active.example.com",
          places: ["barcelona"],
          geoScope: "town",
          startDate: "2026-01-01",
          endDate: "2026-01-31",
        },
        {
          businessName: "Expired Sponsor",
          imageUrl: "https://example.com/expired.jpg",
          targetUrl: "https://expired.example.com",
          places: ["mataro"],
          geoScope: "town",
          startDate: "2026-01-01",
          endDate: "2026-01-10", // Before fixed date
        },
        {
          businessName: "Future Sponsor",
          imageUrl: "https://example.com/future.jpg",
          targetUrl: "https://future.example.com",
          places: ["gracia"],
          geoScope: "town",
          startDate: "2026-01-20", // After fixed date
          endDate: "2026-01-31",
        },
      ];
      const { getAllActiveSponsors } = createMockSponsorModule(sponsors);

      const active = getAllActiveSponsors();
      expect(active).toHaveLength(1);
      expect(active[0].businessName).toBe("Active Sponsor");
    });

    test("returns multiple active sponsors when several are valid", () => {
      const sponsors: SponsorConfig[] = [
        {
          businessName: "Sponsor A",
          imageUrl: "https://example.com/a.jpg",
          targetUrl: "https://a.example.com",
          places: ["barcelona"],
          geoScope: "town",
          startDate: "2026-01-01",
          endDate: "2026-01-31",
        },
        {
          businessName: "Sponsor B",
          imageUrl: "https://example.com/b.jpg",
          targetUrl: "https://b.example.com",
          places: ["mataro"],
          geoScope: "town",
          startDate: "2026-01-10",
          endDate: "2026-01-20",
        },
      ];
      const { getAllActiveSponsors } = createMockSponsorModule(sponsors);

      const active = getAllActiveSponsors();
      expect(active).toHaveLength(2);
      expect(active.map((s) => s.businessName)).toContain("Sponsor A");
      expect(active.map((s) => s.businessName)).toContain("Sponsor B");
    });
  });

  describe("getRemainingDays", () => {
    test("counts remaining days inclusive of end date", () => {
      const sponsor: SponsorConfig = {
        businessName: "Remaining Days Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["barcelona"],
        geoScope: "town",
        startDate: "2026-01-01",
        endDate: "2026-01-20",
      };
      const { getRemainingDays } = createMockSponsorModule([sponsor]);

      const todayUtc = new Date(Date.UTC(2026, 0, 15));
      expect(getRemainingDays(sponsor, todayUtc)).toBe(6);
    });

    test("returns 1 on the last active day", () => {
      const sponsor: SponsorConfig = {
        businessName: "Last Day Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["barcelona"],
        geoScope: "town",
        startDate: "2026-01-01",
        endDate: "2026-01-15",
      };
      const { getRemainingDays } = createMockSponsorModule([sponsor]);

      const todayUtc = new Date(Date.UTC(2026, 0, 15));
      expect(getRemainingDays(sponsor, todayUtc)).toBe(1);
    });
  });

  describe("getOccupiedPlaceStatus", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test("returns remaining days for active places", () => {
      const sponsors: SponsorConfig[] = [
        {
          businessName: "Active Sponsor",
          imageUrl: "https://example.com/banner.jpg",
          targetUrl: "https://example.com",
          places: ["barcelona", "gracia"],
          geoScope: "town",
          startDate: "2026-01-01",
          endDate: "2026-01-20",
        },
        {
          businessName: "Expired Sponsor",
          imageUrl: "https://example.com/banner.jpg",
          targetUrl: "https://example.com",
          places: ["mataro"],
          geoScope: "town",
          startDate: "2026-01-01",
          endDate: "2026-01-10",
        },
      ];
      const { getOccupiedPlaceStatus } = createMockSponsorModule(sponsors);

      const status = getOccupiedPlaceStatus();
      expect(status.get("barcelona")).toBe(6);
      expect(status.get("gracia")).toBe(6);
      expect(status.has("mataro")).toBe(false);
    });

    test("keeps first match when multiple sponsors cover same place", () => {
      const sponsors: SponsorConfig[] = [
        {
          businessName: "First Sponsor",
          imageUrl: "https://example.com/first.jpg",
          targetUrl: "https://first.example.com",
          places: ["barcelona"],
          geoScope: "town",
          startDate: "2026-01-01",
          endDate: "2026-01-20",
        },
        {
          businessName: "Second Sponsor",
          imageUrl: "https://example.com/second.jpg",
          targetUrl: "https://second.example.com",
          places: ["barcelona"],
          geoScope: "town",
          startDate: "2026-01-01",
          endDate: "2026-01-25",
        },
      ];
      const { getOccupiedPlaceStatus } = createMockSponsorModule(sponsors);

      const status = getOccupiedPlaceStatus();
      expect(status.get("barcelona")).toBe(6);
    });
  });

  describe("Date Edge Cases", () => {
    test("handles timezone correctly (start of day normalization)", () => {
      // Test at different times of the day in UTC
      // Since our logic is UTC-based, test times must also be UTC
      vi.useFakeTimers();

      const sponsor: SponsorConfig = {
        businessName: "Timezone Test",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["barcelona"],
        geoScope: "town",
        startDate: "2026-01-15",
        endDate: "2026-01-15",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([sponsor]);

      // Test at start of day (UTC)
      vi.setSystemTime(new Date("2026-01-15T00:00:01Z"));
      expect(getActiveSponsorForPlace("barcelona")).not.toBeNull();

      // Test at end of day (UTC)
      vi.setSystemTime(new Date("2026-01-15T23:59:59Z"));
      expect(getActiveSponsorForPlace("barcelona")).not.toBeNull();

      vi.useRealTimers();
    });

    test("handles single-day sponsorship correctly", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));

      const sponsor: SponsorConfig = {
        businessName: "One Day Sponsor",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["barcelona"],
        geoScope: "town",
        startDate: "2026-01-15",
        endDate: "2026-01-15",
      };
      const { getActiveSponsorForPlace } = createMockSponsorModule([sponsor]);

      expect(getActiveSponsorForPlace("barcelona")).not.toBeNull();

      // Day before
      vi.setSystemTime(new Date("2026-01-14T12:00:00Z"));
      expect(getActiveSponsorForPlace("barcelona")).toBeNull();

      // Day after
      vi.setSystemTime(new Date("2026-01-16T12:00:00Z"));
      expect(getActiveSponsorForPlace("barcelona")).toBeNull();

      vi.useRealTimers();
    });
  });

  describe("SponsorConfig Validation", () => {
    test("sponsor config has all required fields", () => {
      const validSponsor: SponsorConfig = {
        businessName: "Valid Business",
        imageUrl: "https://example.com/banner.jpg",
        targetUrl: "https://example.com",
        places: ["barcelona"],
        geoScope: "town",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      };

      // Type check - all required fields present
      expect(validSponsor.businessName).toBeDefined();
      expect(validSponsor.imageUrl).toBeDefined();
      expect(validSponsor.targetUrl).toBeDefined();
      expect(validSponsor.places).toBeDefined();
      expect(validSponsor.geoScope).toBeDefined();
      expect(validSponsor.startDate).toBeDefined();
      expect(validSponsor.endDate).toBeDefined();
    });

    test("geoScope matches expected values", () => {
      const geoScopes: Array<"town" | "region" | "country"> = [
        "town",
        "region",
        "country",
      ];

      geoScopes.forEach((scope) => {
        const sponsor: SponsorConfig = {
          businessName: "Test",
          imageUrl: "https://example.com/banner.jpg",
          targetUrl: "https://example.com",
          places: ["test"],
          geoScope: scope,
          startDate: "2026-01-01",
          endDate: "2026-01-31",
        };
        expect(["town", "region", "country"]).toContain(sponsor.geoScope);
      });
    });
  });
});

/**
 * Tests for checkout helper functions
 * These helpers build URLSearchParams for Stripe checkout sessions
 */
describe("Checkout Helpers", () => {
  describe("buildLineItemParams", () => {
    test("builds line item with correct currency and quantity", () => {
      const params = new URLSearchParams();
      buildLineItemParams(params, "7days", "town", "ca");

      expect(params.get("line_items[0][price_data][currency]")).toBe("eur");
      expect(params.get("line_items[0][quantity]")).toBe("1");
    });

    test("sets correct product name for Catalan locale", () => {
      const params = new URLSearchParams();
      buildLineItemParams(params, "7days", "town", "ca");

      expect(params.get("line_items[0][price_data][product_data][name]")).toBe(
        "Patrocini 7 dies",
      );
    });

    test("sets correct product name for Spanish locale", () => {
      const params = new URLSearchParams();
      buildLineItemParams(params, "7days", "town", "es");

      expect(params.get("line_items[0][price_data][product_data][name]")).toBe(
        "Patrocinio 7 días",
      );
    });

    test("sets correct product name for English locale", () => {
      const params = new URLSearchParams();
      buildLineItemParams(params, "7days", "town", "en");

      expect(params.get("line_items[0][price_data][product_data][name]")).toBe(
        "Sponsorship 7 days",
      );
    });

    test("falls back to Catalan for unknown locale", () => {
      const params = new URLSearchParams();
      buildLineItemParams(params, "7days", "town", "fr");

      expect(params.get("line_items[0][price_data][product_data][name]")).toBe(
        "Patrocini 7 dies",
      );
    });

    test("includes duration days in description", () => {
      const params = new URLSearchParams();
      buildLineItemParams(params, "14days", "town", "ca");

      const description = params.get(
        "line_items[0][price_data][product_data][description]",
      );
      expect(description).toContain("14");
      expect(description).toContain("dies de patrocini");
    });

    test("sets unit_amount as integer (cents)", () => {
      const params = new URLSearchParams();
      buildLineItemParams(params, "7days", "town", "ca");

      const amount = params.get("line_items[0][price_data][unit_amount]");
      expect(amount).toBeDefined();
      expect(Number(amount)).toBeGreaterThan(0);
      expect(Number(amount) % 1).toBe(0); // Should be integer
    });

    test("price varies by duration", () => {
      const params7days = new URLSearchParams();
      const params30days = new URLSearchParams();

      buildLineItemParams(params7days, "7days", "town", "ca");
      buildLineItemParams(params30days, "30days", "town", "ca");

      const price7 = Number(
        params7days.get("line_items[0][price_data][unit_amount]"),
      );
      const price30 = Number(
        params30days.get("line_items[0][price_data][unit_amount]"),
      );

      expect(price30).toBeGreaterThan(price7);
    });

    test("price varies by geoScope", () => {
      const paramsTown = new URLSearchParams();
      const paramsRegion = new URLSearchParams();
      const paramsCountry = new URLSearchParams();

      buildLineItemParams(paramsTown, "7days", "town", "ca");
      buildLineItemParams(paramsRegion, "7days", "region", "ca");
      buildLineItemParams(paramsCountry, "7days", "country", "ca");

      const priceTown = Number(
        paramsTown.get("line_items[0][price_data][unit_amount]"),
      );
      const priceRegion = Number(
        paramsRegion.get("line_items[0][price_data][unit_amount]"),
      );
      const priceCountry = Number(
        paramsCountry.get("line_items[0][price_data][unit_amount]"),
      );

      expect(priceRegion).toBeGreaterThan(priceTown);
      expect(priceCountry).toBeGreaterThan(priceRegion);
    });
  });

  describe("buildCustomFieldParams", () => {
    test("creates two custom fields", () => {
      const params = new URLSearchParams();
      buildCustomFieldParams(params, "ca");

      expect(params.get("custom_fields[0][key]")).toBe("business_name");
      expect(params.get("custom_fields[1][key]")).toBe("target_url");
    });

    test("business_name field is required (no optional flag)", () => {
      const params = new URLSearchParams();
      buildCustomFieldParams(params, "ca");

      expect(params.get("custom_fields[0][optional]")).toBeNull();
    });

    test("target_url field is optional", () => {
      const params = new URLSearchParams();
      buildCustomFieldParams(params, "ca");

      expect(params.get("custom_fields[1][optional]")).toBe("true");
    });

    test("sets Catalan labels for ca locale", () => {
      const params = new URLSearchParams();
      buildCustomFieldParams(params, "ca");

      expect(params.get("custom_fields[0][label][custom]")).toBe(
        "Nom del negoci",
      );
      expect(params.get("custom_fields[1][label][custom]")).toBe(
        "URL del teu web (opcional)",
      );
    });

    test("sets Spanish labels for es locale", () => {
      const params = new URLSearchParams();
      buildCustomFieldParams(params, "es");

      expect(params.get("custom_fields[0][label][custom]")).toBe(
        "Nombre del negocio",
      );
      expect(params.get("custom_fields[1][label][custom]")).toBe(
        "URL de tu web (opcional)",
      );
    });

    test("sets English labels for en locale", () => {
      const params = new URLSearchParams();
      buildCustomFieldParams(params, "en");

      expect(params.get("custom_fields[0][label][custom]")).toBe(
        "Business name",
      );
      expect(params.get("custom_fields[1][label][custom]")).toBe(
        "Your website URL (optional)",
      );
    });

    test("falls back to Catalan labels for unknown locale", () => {
      const params = new URLSearchParams();
      buildCustomFieldParams(params, "de");

      expect(params.get("custom_fields[0][label][custom]")).toBe(
        "Nom del negoci",
      );
    });

    test("all fields use text type", () => {
      const params = new URLSearchParams();
      buildCustomFieldParams(params, "ca");

      expect(params.get("custom_fields[0][type]")).toBe("text");
      expect(params.get("custom_fields[1][type]")).toBe("text");
    });
  });

  describe("buildMetadataParams", () => {
    test("sets product type as sponsor_banner", () => {
      const params = new URLSearchParams();
      buildMetadataParams(params, "7days", "barcelona", "Barcelona", "town");

      expect(params.get("metadata[product]")).toBe("sponsor_banner");
    });

    test("includes duration and duration_days", () => {
      const params = new URLSearchParams();
      buildMetadataParams(params, "14days", "barcelona", "Barcelona", "town");

      expect(params.get("metadata[duration]")).toBe("14days");
      expect(params.get("metadata[duration_days]")).toBe("14");
    });

    test("includes place information", () => {
      const params = new URLSearchParams();
      buildMetadataParams(params, "7days", "mataro", "Mataró", "town");

      expect(params.get("metadata[place]")).toBe("mataro");
      expect(params.get("metadata[place_name]")).toBe("Mataró");
    });

    test("includes geo_scope", () => {
      const params = new URLSearchParams();
      buildMetadataParams(params, "7days", "barcelona", "Barcelona", "region");

      expect(params.get("metadata[geo_scope]")).toBe("region");
    });

    test("duplicates metadata to payment_intent_data for Dashboard visibility", () => {
      const params = new URLSearchParams();
      buildMetadataParams(params, "7days", "barcelona", "Barcelona", "country");

      // Check that all metadata is also set on payment_intent_data
      expect(params.get("payment_intent_data[metadata][product]")).toBe(
        "sponsor_banner",
      );
      expect(params.get("payment_intent_data[metadata][duration]")).toBe(
        "7days",
      );
      expect(params.get("payment_intent_data[metadata][duration_days]")).toBe(
        "7",
      );
      expect(params.get("payment_intent_data[metadata][place]")).toBe(
        "barcelona",
      );
      expect(params.get("payment_intent_data[metadata][place_name]")).toBe(
        "Barcelona",
      );
      expect(params.get("payment_intent_data[metadata][geo_scope]")).toBe(
        "country",
      );
    });

    test("handles all duration values correctly", () => {
      const durations = ["7days", "14days", "30days"] as const;
      const expectedDays = ["7", "14", "30"];

      durations.forEach((duration, index) => {
        const params = new URLSearchParams();
        buildMetadataParams(params, duration, "test", "Test", "town");

        expect(params.get("metadata[duration]")).toBe(duration);
        expect(params.get("metadata[duration_days]")).toBe(expectedDays[index]);
      });
    });
  });
});
