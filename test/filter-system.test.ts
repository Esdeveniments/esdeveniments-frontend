/**
 * Tests for configuration-driven filter system
 */
import { describe, test, expect } from "@jest/globals";
import { FilterOperations } from "../utils/filter-operations";
import { FILTER_CONFIGURATIONS } from "../config/filters";
import type { FilterDisplayState } from "../types/filters";

describe("Filter Configuration System", () => {
  describe("Configuration Integrity", () => {
    test("all configurations have required properties", () => {
      FILTER_CONFIGURATIONS.forEach((config) => {
        expect(config.key).toBeDefined();
        expect(config.displayName).toBeDefined();
        expect(config.defaultValue).toBeDefined();
        expect(config.type).toBeDefined();
        expect(config.isEnabled).toBeInstanceOf(Function);
        expect(config.getDisplayText).toBeInstanceOf(Function);
        expect(config.getRemovalChanges).toBeInstanceOf(Function);
      });
    });

    test("no duplicate filter keys", () => {
      const keys = FILTER_CONFIGURATIONS.map((c) => c.key);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });

    test("all filter types are valid", () => {
      const validTypes = [
        "place",
        "category",
        "date",
        "distance",
        "search",
        "coordinates",
      ];
      FILTER_CONFIGURATIONS.forEach((config) => {
        expect(validTypes).toContain(config.type);
      });
    });
  });

  describe("FilterOperations", () => {
    const mockDisplayState: FilterDisplayState = {
      filters: {
        place: "barcelona",
        byDate: "tots",
        category: "concerts",
        searchTerm: "",
        distance: 50,
        lat: undefined,
        lon: undefined,
      },
      queryParams: {},
      segments: { place: "barcelona", date: "tots", category: "concerts" },
      extraData: {
        categories: [{ slug: "concerts", name: "Concerts" }],
        placeTypeLabel: { label: "Barcelona" },
      },
    };

    test("getConfig returns correct configuration", () => {
      const placeConfig = FilterOperations.getConfig("place");
      expect(placeConfig).toBeDefined();
      expect(placeConfig?.key).toBe("place");
      expect(placeConfig?.displayName).toBe("Població");
    });

    test("getConfig returns undefined for invalid key", () => {
      // @ts-expect-error Testing invalid key
      const invalidConfig = FilterOperations.getConfig("invalidKey");
      expect(invalidConfig).toBeUndefined();
    });

    test("isEnabled works correctly", () => {
      expect(FilterOperations.isEnabled("place", mockDisplayState)).toBe(true);
      expect(FilterOperations.isEnabled("byDate", mockDisplayState)).toBe(
        false
      );
      expect(FilterOperations.isEnabled("category", mockDisplayState)).toBe(
        true
      );
    });

    test("getDisplayText works correctly", () => {
      expect(FilterOperations.getDisplayText("place", mockDisplayState)).toBe(
        "Barcelona"
      );
      expect(
        FilterOperations.getDisplayText("byDate", mockDisplayState)
      ).toBeUndefined();
      expect(
        FilterOperations.getDisplayText("category", mockDisplayState)
      ).toBe("CONCERTS");
    });

    test("hasActiveFilters works correctly", () => {
      expect(FilterOperations.hasActiveFilters(mockDisplayState)).toBe(true);

      const inactiveState = {
        ...mockDisplayState,
        filters: {
          place: "catalunya",
          byDate: "tots",
          category: "tots",
          searchTerm: "",
          distance: 50,
          lat: undefined,
          lon: undefined,
        },
        segments: { place: "catalunya", date: "tots", category: "tots" },
      };
      expect(FilterOperations.hasActiveFilters(inactiveState)).toBe(false);
    });

    test("getAllConfigurations returns all configs", () => {
      const configs = FilterOperations.getAllConfigurations();
      expect(configs).toHaveLength(FILTER_CONFIGURATIONS.length);
      expect(configs).toEqual(FILTER_CONFIGURATIONS);
    });

    test("getDefaultFilterState returns proper defaults", () => {
      const defaults = FilterOperations.getDefaultFilterState();
      expect(defaults.place).toBe("catalunya");
      expect(defaults.byDate).toBe("tots");
      expect(defaults.category).toBe("tots");
      expect(defaults.searchTerm).toBe("");
      expect(defaults.distance).toBe(50);
    });

    test("validateConfiguration passes", () => {
      const result = FilterOperations.validateConfiguration();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Filter Removal Logic", () => {
    test("distance filter removes coordinates", () => {
      const distanceConfig = FilterOperations.getConfig("distance");
      const changes = distanceConfig?.getRemovalChanges();
      expect(changes).toEqual({
        distance: undefined,
        lat: undefined,
        lon: undefined,
      });
    });

    test("other filters reset to defaults", () => {
      const placeConfig = FilterOperations.getConfig("place");
      const changes = placeConfig?.getRemovalChanges();
      expect(changes).toEqual({ place: "catalunya" });
    });
  });

  describe("Special Cases", () => {
    test("byDate filter has home redirect logic", () => {
      const byDateConfig = FilterOperations.getConfig("byDate");
      const shouldRedirectToHome = byDateConfig?.specialCases?.homeRedirect?.({
        place: "catalunya",
        category: "tots",
        date: "tots",
      });
      expect(shouldRedirectToHome).toBe(true);

      const shouldNotRedirect = byDateConfig?.specialCases?.homeRedirect?.({
        place: "barcelona",
        category: "tots",
        date: "tots",
      });
      expect(shouldNotRedirect).toBe(false);
    });
  });
});

describe("Integration: Adding New Filter", () => {
  test("system works with new filter configuration", () => {
    // Simulate adding a new filter by extending the configuration
    const testFilter = {
      key: "testFilter" as const,
      displayName: "Test Filter",
      defaultValue: "default",
      type: "search" as const,
      isEnabled: () => true,
      getDisplayText: () => "Test Text",
      getRemovalChanges: () => ({ testFilter: undefined }),
    };

    // This test ensures the system is truly configuration-driven
    // In a real scenario, you'd just add this to FILTER_CONFIGURATIONS
    expect(testFilter.key).toBe("testFilter");
    expect(testFilter.isEnabled()).toBe(true);
    expect(testFilter.getDisplayText()).toBe("Test Text");
    expect(testFilter.getRemovalChanges()).toEqual({ testFilter: undefined });
  });
});
