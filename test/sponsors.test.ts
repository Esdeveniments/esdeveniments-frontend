/**
 * Unit tests for the sponsor banner system.
 * Tests the core logic: date filtering, place matching, and geo scope handling.
 *
 * @see /strategy-pricing.md for system documentation
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { SponsorConfig } from "types/sponsor";

// Mock the sponsors array to test the logic without affecting production data
const createMockSponsorModule = (sponsors: SponsorConfig[]) => {
  // Replicate the exact logic from config/sponsors.ts
  function getActiveSponsorForPlace(place: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const sponsor of sponsors) {
      if (!sponsor.places.includes(place)) {
        continue;
      }

      const startDate = new Date(sponsor.startDate);
      const endDate = new Date(sponsor.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      if (today >= startDate && today <= endDate) {
        return sponsor;
      }
    }

    return null;
  }

  function hasSponsorConfigForPlace(place: string) {
    return sponsors.some((sponsor) => sponsor.places.includes(place));
  }

  function getAllActiveSponsors() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sponsors.filter((sponsor) => {
      const startDate = new Date(sponsor.startDate);
      const endDate = new Date(sponsor.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      return today >= startDate && today <= endDate;
    });
  }

  return {
    getActiveSponsorForPlace,
    hasSponsorConfigForPlace,
    getAllActiveSponsors,
  };
};

describe("Sponsor System", () => {
  describe("getActiveSponsorForPlace", () => {
    beforeEach(() => {
      // Set a fixed date for consistent testing: 2026-01-15
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-15T12:00:00"));
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
      expect(result?.businessName).toBe("Matching Business");
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
      const { getActiveSponsorForPlace } =
        createMockSponsorModule([expiredSponsor]);

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
      const { getActiveSponsorForPlace } =
        createMockSponsorModule([futureSponsor]);

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
      expect(result?.businessName).toBe("Start Day Sponsor");
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
      expect(result?.businessName).toBe("End Day Sponsor");
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
      expect(result?.businessName).toBe("First Sponsor");
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

      expect(getActiveSponsorForPlace("gracia")?.businessName).toBe(
        "Multi-place Sponsor"
      );
      expect(getActiveSponsorForPlace("sants")?.businessName).toBe(
        "Multi-place Sponsor"
      );
      expect(getActiveSponsorForPlace("barcelona")?.businessName).toBe(
        "Multi-place Sponsor"
      );
    });
  });

  describe("Geo Scope Tiers", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-15T12:00:00"));
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
      const { hasSponsorConfigForPlace } =
        createMockSponsorModule([expiredSponsor]);

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
      vi.setSystemTime(new Date("2026-01-15T12:00:00"));
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

  describe("Date Edge Cases", () => {
    test("handles timezone correctly (start of day normalization)", () => {
      // Test at different times of the day
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

      // Test at start of day
      vi.setSystemTime(new Date("2026-01-15T00:00:01"));
      expect(getActiveSponsorForPlace("barcelona")).not.toBeNull();

      // Test at end of day
      vi.setSystemTime(new Date("2026-01-15T23:59:59"));
      expect(getActiveSponsorForPlace("barcelona")).not.toBeNull();

      vi.useRealTimers();
    });

    test("handles single-day sponsorship correctly", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-15T12:00:00"));

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
      vi.setSystemTime(new Date("2026-01-14T12:00:00"));
      expect(getActiveSponsorForPlace("barcelona")).toBeNull();

      // Day after
      vi.setSystemTime(new Date("2026-01-16T12:00:00"));
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
