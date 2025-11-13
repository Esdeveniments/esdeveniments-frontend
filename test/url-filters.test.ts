import { describe, it, expect } from "vitest";
import {
  buildCanonicalUrlDynamic,
  parseFiltersFromUrl,
  urlToFilterState,
  getRedirectUrl,
  isValidCategorySlug,
  toUrlSearchParams,
  buildFallbackUrlForInvalidPlace,
} from "../utils/url-filters";
import { DEFAULT_FILTER_VALUE, MAX_QUERY_PARAMS } from "../utils/constants";

describe("url-filters: canonical building and parsing", () => {
  it("omits tots date and category when both default", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: DEFAULT_FILTER_VALUE,
      category: DEFAULT_FILTER_VALUE,
    });
    expect(url).toBe("/barcelona");
  });

  it("omits tots date when category is specific", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: DEFAULT_FILTER_VALUE,
      category: "concerts",
    });
    expect(url).toBe("/barcelona/concerts");
  });

  it("keeps date when category is tots", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: "avui",
      category: DEFAULT_FILTER_VALUE,
    });
    expect(url).toBe("/barcelona/avui");
  });

  it("includes search and non-default distance as query", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: "avui",
      category: DEFAULT_FILTER_VALUE,
      searchTerm: "rock",
      distance: 25,
    });
    expect(url).toBe("/barcelona/avui?search=rock&distance=25");
  });

  it("parses 1, 2 and 3 segments correctly", () => {
    const one = parseFiltersFromUrl(
      { place: "catalunya" },
      new URLSearchParams("")
    );
    expect(one.segments).toEqual({
      place: "catalunya",
      date: DEFAULT_FILTER_VALUE,
      category: DEFAULT_FILTER_VALUE,
    });

    const twoDate = parseFiltersFromUrl(
      { place: "catalunya", date: "avui" },
      new URLSearchParams("")
    );
    expect(twoDate.segments).toEqual({
      place: "catalunya",
      date: "avui",
      category: DEFAULT_FILTER_VALUE,
    });

    const twoCat = parseFiltersFromUrl(
      { place: "catalunya", category: "concerts" },
      new URLSearchParams("")
    );
    expect(twoCat.segments).toEqual({
      place: "catalunya",
      date: DEFAULT_FILTER_VALUE,
      category: "concerts",
    });

    const three = parseFiltersFromUrl(
      { place: "girona", date: "avui", category: "concerts" },
      new URLSearchParams("search=art")
    );
    expect(three.segments).toEqual({
      place: "girona",
      date: "avui",
      category: "concerts",
    });
    expect(three.queryParams.search).toBe("art");
  });

  it("urlToFilterState converts parsed filters and preserves defaults for numbers", () => {
    const parsed = parseFiltersFromUrl(
      { place: "lleida" },
      new URLSearchParams("")
    );
    const state = urlToFilterState(parsed);
    expect(state).toEqual({
      place: "lleida",
      byDate: DEFAULT_FILTER_VALUE,
      category: DEFAULT_FILTER_VALUE,
      searchTerm: "",
      distance: 50,
      lat: undefined,
      lon: undefined,
    });
  });

  it("getRedirectUrl returns canonical URL when parsed is not canonical", () => {
    const parsed = parseFiltersFromUrl(
      { place: "tarragona", date: "xx", category: "yy" },
      new URLSearchParams("")
    );
    const redirect = getRedirectUrl(parsed);
    // "xx" is not a valid date, "yy" is format-valid but not in API
    // Without dynamic categories, format-valid slugs are accepted
    // The category will be validated at runtime against API
    expect(redirect).toBe("/tarragona/yy");
  });

  it("redirects /place/invalid-category to /place when category format is invalid", () => {
    // Invalid format category -> normalizes to 'tots'
    const parsed = parseFiltersFromUrl(
      { place: "barcelona", category: "not a category!" }, // Invalid format (has spaces)
      new URLSearchParams("")
    );
    expect(parsed.isCanonical).toBe(false);
    const redirect = getRedirectUrl(parsed);
    expect(redirect).toBe("/barcelona");
  });

  it("preserves format-valid category when dynamic categories not provided", () => {
    // Format-valid category is preserved (will be validated at runtime)
    const parsed = parseFiltersFromUrl(
      { place: "barcelona", category: "not-a-category" }, // Valid format
      new URLSearchParams("")
    );
    // Without dynamic categories, format-valid slugs are accepted
    expect(parsed.isCanonical).toBe(true);
  });

  it("redirects /place/date/invalid-format-category to /place/date", () => {
    // Invalid format category with valid date -> category becomes 'tots' and is omitted
    const parsed = parseFiltersFromUrl(
      { place: "barcelona", date: "avui", category: "not a category!" }, // Invalid format
      new URLSearchParams("")
    );
    expect(parsed.isCanonical).toBe(false);
    const redirect = getRedirectUrl(parsed);
    expect(redirect).toBe("/barcelona/avui");
  });

  it("preserves format-valid category with date when dynamic categories not provided", () => {
    // Format-valid category is preserved (will be validated at runtime)
    const parsed = parseFiltersFromUrl(
      { place: "barcelona", date: "avui", category: "not-a-category" }, // Valid format
      new URLSearchParams("")
    );
    // Without dynamic categories, format-valid slugs are accepted
    expect(parsed.isCanonical).toBe(true);
  });

  it("reads category from query params when only place segment exists", () => {
    const dynamicCategories = [{ id: 1, name: "Teatre", slug: "teatre" }];
    const parsed = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("category=teatre"),
      dynamicCategories
    );
    expect(parsed.segments).toEqual({
      place: "barcelona",
      date: DEFAULT_FILTER_VALUE,
      category: "teatre",
    });
    expect(parsed.isCanonical).toBe(false);
  });

  it("reads date from query params when only place segment exists", () => {
    const parsed = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("date=avui")
    );
    expect(parsed.segments).toEqual({
      place: "barcelona",
      date: "avui",
      category: DEFAULT_FILTER_VALUE,
    });
    expect(parsed.isCanonical).toBe(false);
  });

  it("reads both category and date from query params", () => {
    const dynamicCategories = [{ id: 1, name: "Teatre", slug: "teatre" }];
    const parsed = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("category=teatre&date=tots"),
      dynamicCategories
    );
    expect(parsed.segments).toEqual({
      place: "barcelona",
      date: DEFAULT_FILTER_VALUE,
      category: "teatre",
    });
    expect(parsed.isCanonical).toBe(false);
  });

  it("marks URL as non-canonical when category/date are in query params", () => {
    const withCategory = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("category=concerts")
    );
    expect(withCategory.isCanonical).toBe(false);

    const withDate = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("date=avui")
    );
    expect(withDate.isCanonical).toBe(false);

    const withBoth = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("category=concerts&date=avui")
    );
    expect(withBoth.isCanonical).toBe(false);
  });

  it("getRedirectUrl redirects query params to canonical path", () => {
    // Test case from E2E: /barcelona?category=teatre&date=tots -> /barcelona/teatre
    const dynamicCategories = [{ id: 1, name: "Teatre", slug: "teatre" }];
    const parsed = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("category=teatre&date=tots"),
      dynamicCategories
    );
    const redirect = getRedirectUrl(parsed);
    expect(redirect).toBe("/barcelona/teatre");
  });

  it("preserves search query params when redirecting from query params", () => {
    const dynamicCategories = [{ id: 1, name: "Teatre", slug: "teatre" }];
    const parsed = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("category=teatre&date=tots&search=castellers"),
      dynamicCategories
    );
    const redirect = getRedirectUrl(parsed);
    expect(redirect).toBe("/barcelona/teatre?search=castellers");
  });

  it("handles query params with 2-segment URLs", () => {
    // /barcelona/teatre?date=avui should redirect to /barcelona/avui/teatre
    const dynamicCategories = [{ id: 1, name: "Teatre", slug: "teatre" }];
    const parsed = parseFiltersFromUrl(
      { place: "barcelona", category: "teatre" },
      new URLSearchParams("date=avui"),
      dynamicCategories
    );
    expect(parsed.segments).toEqual({
      place: "barcelona",
      date: "avui",
      category: "teatre",
    });
    expect(parsed.isCanonical).toBe(false);
    const redirect = getRedirectUrl(parsed);
    expect(redirect).toBe("/barcelona/avui/teatre");
  });

  it("redirects /place/tots to /place (omits tots segment)", () => {
    // /barcelona/tots should redirect to /barcelona
    const parsed = parseFiltersFromUrl(
      { place: "barcelona", date: DEFAULT_FILTER_VALUE },
      new URLSearchParams(),
      []
    );
    expect(parsed.isCanonical).toBe(false);
    const redirect = getRedirectUrl(parsed);
    expect(redirect).toBe("/barcelona");
  });

  it("redirects /place/tots/category to /place/category (omits tots segment)", () => {
    // /barcelona/tots/teatre should redirect to /barcelona/teatre
    const dynamicCategories = [{ id: 1, name: "Teatre", slug: "teatre" }];
    const parsed = parseFiltersFromUrl(
      { place: "barcelona", date: DEFAULT_FILTER_VALUE, category: "teatre" },
      new URLSearchParams(),
      dynamicCategories
    );
    expect(parsed.isCanonical).toBe(false);
    const redirect = getRedirectUrl(parsed);
    expect(redirect).toBe("/barcelona/teatre");
  });

  it("preserves query params when redirecting /place/tots", () => {
    // /barcelona/tots?search=castellers should redirect to /barcelona?search=castellers
    const parsed = parseFiltersFromUrl(
      { place: "barcelona", date: DEFAULT_FILTER_VALUE },
      new URLSearchParams("search=castellers"),
      []
    );
    expect(parsed.isCanonical).toBe(false);
    const redirect = getRedirectUrl(parsed);
    expect(redirect).toBe("/barcelona?search=castellers");
  });
});

describe("url-filters: category slug validation", () => {
  it("accepts format-valid category slugs and tots when no dynamic categories", () => {
    // Without dynamic categories, format validation is used
    expect(isValidCategorySlug("concerts")).toBe(true); // Valid format
    expect(isValidCategorySlug(DEFAULT_FILTER_VALUE)).toBe(true);
  });

  it("accepts dynamic categories when provided", () => {
    const dynamic = [{ id: 1, name: "Fires", slug: "fires-i-mercats" }];
    expect(isValidCategorySlug("fires-i-mercats", dynamic)).toBe(true);
  });

  it("accepts format-valid categories when dynamic categories not provided", () => {
    // Without dynamic categories, format validation is used (allows build-time scenarios)
    // The category will be validated against API at runtime
    expect(isValidCategorySlug("unknown-slug")).toBe(true); // Valid format
    expect(isValidCategorySlug("unknown slug!")).toBe(false); // Invalid format
  });

  it("rejects unknown categories when dynamic categories are provided", () => {
    const dynamic = [{ id: 1, name: "Teatre", slug: "teatre" }];
    expect(isValidCategorySlug("unknown-slug", dynamic)).toBe(false);
    expect(isValidCategorySlug("teatre", dynamic)).toBe(true);
  });
});

describe("url-filters: toUrlSearchParams conversion", () => {
  it("converts string values correctly", () => {
    const raw = { search: "rock", distance: "25" };
    const params = toUrlSearchParams(raw);
    expect(params.get("search")).toBe("rock");
    expect(params.get("distance")).toBe("25");
  });

  it("handles array values by appending all entries", () => {
    const raw = { category: ["concerts", "festivals"] };
    const params = toUrlSearchParams(raw);
    expect(params.getAll("category")).toEqual(["concerts", "festivals"]);
  });

  it("filters out undefined values", () => {
    const raw = { search: "rock", distance: undefined, lat: "41.3888" };
    const params = toUrlSearchParams(raw);
    expect(params.has("distance")).toBe(false);
    expect(params.get("search")).toBe("rock");
    expect(params.get("lat")).toBe("41.3888");
  });

  it("filters out null values in arrays", () => {
    const raw = { category: ["concerts", null as any, "festivals"] };
    const params = toUrlSearchParams(raw);
    expect(params.getAll("category")).toEqual(["concerts", "festivals"]);
  });

  it("handles empty object", () => {
    const raw = {};
    const params = toUrlSearchParams(raw);
    expect(params.toString()).toBe("");
  });

  it("handles mixed string and array values", () => {
    const raw = {
      search: "rock",
      category: ["concerts", "festivals"],
      distance: "25",
    };
    const params = toUrlSearchParams(raw);
    expect(params.get("search")).toBe("rock");
    expect(params.getAll("category")).toEqual(["concerts", "festivals"]);
    expect(params.get("distance")).toBe("25");
  });

  it("handles empty arrays", () => {
    const raw = { category: [], search: "rock" };
    const params = toUrlSearchParams(raw);
    expect(params.has("category")).toBe(false);
    expect(params.get("search")).toBe("rock");
  });

  describe("security: MAX_QUERY_PARAMS limit enforcement", () => {
    it("enforces MAX_QUERY_PARAMS limit per parameter value, not per key", () => {
      // Create an array with more values than MAX_QUERY_PARAMS
      const manyValues = Array.from({ length: MAX_QUERY_PARAMS + 10 }, (_, i) => `value${i}`);
      const raw = { foo: manyValues };
      const params = toUrlSearchParams(raw);
      
      // Should only append MAX_QUERY_PARAMS values, not all of them
      expect(params.getAll("foo").length).toBe(MAX_QUERY_PARAMS);
      expect(params.getAll("foo")[0]).toBe("value0");
      expect(params.getAll("foo")[MAX_QUERY_PARAMS - 1]).toBe(`value${MAX_QUERY_PARAMS - 1}`);
    });

    it("stops appending when MAX_QUERY_PARAMS is reached across multiple keys", () => {
      // Create multiple keys that together exceed the limit
      const raw: Record<string, string | string[]> = {};
      for (let i = 0; i < 10; i++) {
        raw[`key${i}`] = Array.from({ length: 10 }, (_, j) => `value${i}-${j}`);
      }
      const params = toUrlSearchParams(raw);
      
      // Count total parameters
      let totalParams = 0;
      for (const key of Object.keys(raw)) {
        totalParams += params.getAll(key).length;
      }
      
      // Should not exceed MAX_QUERY_PARAMS
      expect(totalParams).toBeLessThanOrEqual(MAX_QUERY_PARAMS);
    });

    it("handles single string values correctly within limit", () => {
      const raw: Record<string, string> = {};
      for (let i = 0; i < MAX_QUERY_PARAMS; i++) {
        raw[`key${i}`] = `value${i}`;
      }
      const params = toUrlSearchParams(raw);
      
      // All should be present
      expect(params.get("key0")).toBe("value0");
      expect(params.get(`key${MAX_QUERY_PARAMS - 1}`)).toBe(`value${MAX_QUERY_PARAMS - 1}`);
    });

    it("stops at MAX_QUERY_PARAMS even with mixed arrays and strings", () => {
      const raw: Record<string, string | string[]> = {
        single1: "value1",
        array: Array.from({ length: MAX_QUERY_PARAMS }, (_, i) => `array${i}`),
        single2: "value2",
      };
      const params = toUrlSearchParams(raw);
      
      // Count total parameters
      let totalParams = 0;
      totalParams += params.getAll("single1").length;
      totalParams += params.getAll("array").length;
      totalParams += params.getAll("single2").length;
      
      // Should not exceed MAX_QUERY_PARAMS
      expect(totalParams).toBeLessThanOrEqual(MAX_QUERY_PARAMS);
    });
  });
});

describe("url-filters: buildFallbackUrlForInvalidPlace", () => {
  describe("basic fallback to catalunya", () => {
    it("returns /catalunya when no segments or query params", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya");
    });

    it("returns /catalunya with empty byDate and category", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "",
        category: "",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya");
    });

    it("returns /catalunya with undefined byDate and category", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya");
    });
  });

  describe("valid date slugs", () => {
    it("preserves valid date slug 'avui'", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "avui",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya/avui");
    });

    it("preserves valid date slug 'dema'", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "dema",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya/dema");
    });

    it("preserves valid date slug 'setmana'", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "setmana",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya/setmana");
    });

    it("preserves valid date slug 'cap-de-setmana'", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "cap-de-setmana",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya/cap-de-setmana");
    });

    it("omits 'tots' date slug (default)", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: DEFAULT_FILTER_VALUE,
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya");
    });
  });

  describe("invalid date slugs", () => {
    it("defaults invalid date slug to 'tots' and omits it", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "invalid-date",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya");
    });

    it("defaults empty string date to 'tots'", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya");
    });

    it("defaults null-like date to 'tots'", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "null" as any,
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya");
    });

    it("defaults special characters in date to 'tots'", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "avui/dema",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya");
    });

    it("defaults numeric date to 'tots'", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "2024-01-15",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya");
    });
  });

  describe("category handling", () => {
    it("preserves valid category slug", () => {
      const url = buildFallbackUrlForInvalidPlace({
        category: "teatre",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya/teatre");
    });

    it("preserves legacy category slug", () => {
      const url = buildFallbackUrlForInvalidPlace({
        category: "concerts",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya/concerts");
    });

    it("omits 'tots' category (default)", () => {
      const url = buildFallbackUrlForInvalidPlace({
        category: DEFAULT_FILTER_VALUE,
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya");
    });

    it("preserves invalid category slug (will be normalized by buildCanonicalUrl)", () => {
      // Note: buildCanonicalUrl will normalize invalid categories to 'tots'
      // but we test that the function accepts any string
      const url = buildFallbackUrlForInvalidPlace({
        category: "unknown-category",
        rawSearchParams: {},
      });
      // The category is passed through, but buildCanonicalUrl may normalize it
      expect(url).toContain("/catalunya");
    });

    it("handles empty string category", () => {
      const url = buildFallbackUrlForInvalidPlace({
        category: "",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya");
    });
  });

  describe("date and category combinations", () => {
    it("combines valid date and category", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "avui",
        category: "teatre",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya/avui/teatre");
    });

    it("omits date when both are 'tots'", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: DEFAULT_FILTER_VALUE,
        category: DEFAULT_FILTER_VALUE,
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya");
    });

    it("omits date when date is 'tots' but category is specific", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: DEFAULT_FILTER_VALUE,
        category: "concerts",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya/concerts");
    });

    it("omits category when category is 'tots' but date is specific", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "avui",
        category: DEFAULT_FILTER_VALUE,
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya/avui");
    });

    it("handles invalid date with valid category", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "invalid",
        category: "teatre",
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya/teatre");
    });

    it("handles valid date with invalid category", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "avui",
        category: "unknown",
        rawSearchParams: {},
      });
      // Date is preserved, category may be normalized
      expect(url).toContain("/catalunya/avui");
    });

    it("derives category from byDate when byDate is not a valid date but is a valid category slug", () => {
      // Scenario: /foo/festivals where "festivals" is parsed as byDate but is actually a category
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "festivals",
        rawSearchParams: {},
      });
      // Should preserve the category intent: /catalunya/festivals
      expect(url).toBe("/catalunya/festivals");
    });

    it("derives category from byDate when byDate is a category slug format", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "teatre",
        rawSearchParams: {},
      });
      // Should preserve the category intent: /catalunya/teatre
      expect(url).toBe("/catalunya/teatre");
    });

    it("prefers explicit category over derived from byDate", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "festivals", // Could be derived as category
        category: "teatre", // But explicit category takes precedence
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya/teatre");
    });
  });

  describe("allowed query params preservation", () => {
    it("preserves search query param", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { search: "castellers" },
      });
      expect(url).toBe("/catalunya?search=castellers");
    });

    it("preserves distance query param", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { distance: "25" },
      });
      expect(url).toBe("/catalunya?distance=25");
    });

    it("preserves lat query param", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { lat: "41.3888" },
      });
      expect(url).toBe("/catalunya?lat=41.3888");
    });

    it("preserves lon query param", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { lon: "2.1590" },
      });
      // parseFloat removes trailing zeros, so 2.1590 becomes 2.159
      expect(url).toBe("/catalunya?lon=2.159");
    });

    it("preserves all allowed query params together", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: {
          search: "castellers",
          distance: "25",
          lat: "41.3888",
          lon: "2.1590",
        },
      });
      expect(url).toContain("/catalunya?");
      expect(url).toContain("search=castellers");
      expect(url).toContain("distance=25");
      expect(url).toContain("lat=41.3888");
      // parseFloat removes trailing zeros, so 2.1590 becomes 2.159
      expect(url).toContain("lon=2.159");
    });

    it("preserves query params with date and category", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "avui",
        category: "teatre",
        rawSearchParams: { search: "rock", distance: "30" },
      });
      expect(url).toContain("/catalunya/avui/teatre?");
      expect(url).toContain("search=rock");
      expect(url).toContain("distance=30");
    });
  });

  describe("disallowed query params filtering", () => {
    it("uses category query param (preserves category intent)", () => {
      // Category query params are now used to preserve category intent
      // This is the fix: /foo?category=teatre should redirect to /catalunya/teatre
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { category: "teatre", search: "rock" },
      });
      expect(url).toBe("/catalunya/teatre?search=rock");
      expect(url).not.toContain("category="); // Query param is used, not included in URL
    });

    it("filters out date query param", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { date: "avui", search: "rock" },
      });
      expect(url).toBe("/catalunya?search=rock");
      expect(url).not.toContain("date");
    });

    it("uses category query param and filters out date query param", () => {
      // Category query param is used, date query param is filtered (date should be in path)
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: {
          category: "teatre",
          date: "avui",
          search: "rock",
        },
      });
      expect(url).toBe("/catalunya/teatre?search=rock");
      expect(url).not.toContain("category="); // Used but not in query string
      expect(url).not.toContain("date="); // Filtered out
    });

    it("filters out arbitrary query params", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: {
          search: "rock",
          arbitrary: "value",
          another: "param",
        },
      });
      expect(url).toBe("/catalunya?search=rock");
      expect(url).not.toContain("arbitrary");
      expect(url).not.toContain("another");
    });
  });

  describe("coordinate validation", () => {
    it("preserves valid latitude", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { lat: "41.3888" },
      });
      expect(url).toBe("/catalunya?lat=41.3888");
    });

    it("preserves valid longitude", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { lon: "2.1590" },
      });
      // parseFloat removes trailing zeros, so 2.1590 becomes 2.159
      expect(url).toBe("/catalunya?lon=2.159");
    });

    it("filters out invalid latitude (out of range)", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { lat: "91" }, // > 90
      });
      expect(url).toBe("/catalunya");
      expect(url).not.toContain("lat");
    });

    it("filters out invalid latitude (negative out of range)", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { lat: "-91" }, // < -90
      });
      expect(url).toBe("/catalunya");
      expect(url).not.toContain("lat");
    });

    it("filters out invalid longitude (out of range)", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { lon: "181" }, // > 180
      });
      expect(url).toBe("/catalunya");
      expect(url).not.toContain("lon");
    });

    it("filters out invalid longitude (negative out of range)", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { lon: "-181" }, // < -180
      });
      expect(url).toBe("/catalunya");
      expect(url).not.toContain("lon");
    });

    it("filters out non-numeric latitude", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { lat: "not-a-number" },
      });
      expect(url).toBe("/catalunya");
      expect(url).not.toContain("lat");
    });

    it("filters out non-numeric longitude", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { lon: "not-a-number" },
      });
      expect(url).toBe("/catalunya");
      expect(url).not.toContain("lon");
    });

    it("preserves valid boundary coordinates", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { lat: "90", lon: "180" },
      });
      expect(url).toContain("lat=90");
      expect(url).toContain("lon=180");
    });

    it("preserves valid negative boundary coordinates", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { lat: "-90", lon: "-180" },
      });
      expect(url).toContain("lat=-90");
      expect(url).toContain("lon=-180");
    });
  });

  describe("distance handling", () => {
    it("preserves valid distance", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { distance: "25" },
      });
      expect(url).toBe("/catalunya?distance=25");
    });

    it("preserves distance as string", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { distance: "100" },
      });
      expect(url).toBe("/catalunya?distance=100");
    });

    it("handles distance with other params", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { distance: "50", search: "rock" },
      });
      // Distance of 50 is the default, so it's omitted from the URL
      expect(url).toBe("/catalunya?search=rock");
      expect(url).not.toContain("distance");
    });
  });

  describe("array query params handling", () => {
    it("handles array values in searchParams (first value used)", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { search: ["rock", "pop"] },
      });
      // toUrlSearchParams appends all, but buildCanonicalUrl uses first
      expect(url).toContain("search");
    });

    it("handles array values in distance", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { distance: ["25", "50"] },
      });
      expect(url).toContain("distance");
    });

    it("filters out undefined values in arrays", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { search: ["rock", undefined as any, "pop"] },
      });
      expect(url).toContain("search");
    });
  });

  describe("edge cases", () => {
    it("handles empty searchParams object", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya");
    });

    it("handles undefined values in searchParams", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: {
          search: undefined,
          distance: undefined,
          lat: undefined,
          lon: undefined,
        },
      });
      expect(url).toBe("/catalunya");
    });

    it("handles mixed valid and invalid query params", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: {
          search: "rock",
          invalid: "should-be-filtered",
          distance: "25",
          category: "should-be-filtered",
        },
      });
      expect(url).toContain("/catalunya");
      expect(url).toContain("search=rock");
      expect(url).toContain("distance=25");
      expect(url).not.toContain("invalid");
      expect(url).not.toContain("category");
    });

    it("handles special characters in search term", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { search: "castellers & gegants" },
      });
      expect(url).toContain("search=castellers");
    });

    it("handles URL-encoded values", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { search: "rock%20music" },
      });
      expect(url).toContain("search");
    });

    it("handles very long search terms", () => {
      const longSearch = "a".repeat(200);
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { search: longSearch },
      });
      expect(url).toContain("search");
    });

    it("handles all valid date slugs with category", () => {
      const dates = ["avui", "dema", "setmana", "cap-de-setmana"];
      for (const date of dates) {
        const url = buildFallbackUrlForInvalidPlace({
          byDate: date,
          category: "teatre",
          rawSearchParams: {},
        });
        expect(url).toBe(`/catalunya/${date}/teatre`);
      }
    });

    it("handles whitespace in query params", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { search: "  rock  " },
      });
      expect(url).toContain("search");
    });
  });

  describe("real-world scenarios", () => {
    it("handles /teatre/teatre -> /catalunya/teatre scenario", () => {
      // When place="teatre" doesn't exist, byDate="teatre" should be preserved as category
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "teatre", // This is actually a category, not a date
        rawSearchParams: {},
      });
      // "teatre" is not a valid date slug but is a known category, so it should be preserved
      expect(url).toBe("/catalunya/teatre");
    });

    it("handles invalid place with valid date and category", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "avui",
        category: "teatre",
        rawSearchParams: { search: "castellers" },
      });
      expect(url).toBe("/catalunya/avui/teatre?search=castellers");
    });

    it("handles invalid place with location search", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: {
          search: "concerts",
          lat: "41.3888",
          lon: "2.1590",
          distance: "25",
        },
      });
      expect(url).toContain("/catalunya?");
      expect(url).toContain("search=concerts");
      expect(url).toContain("lat=41.3888");
      // parseFloat removes trailing zeros, so 2.1590 becomes 2.159
      expect(url).toContain("lon=2.159");
      expect(url).toContain("distance=25");
    });
  });

  describe("category derivation from query params and dynamic categories", () => {
    it("should preserve dynamic category from byDate", () => {
      // Scenario: /foo/literatura where "literatura" is a dynamic category
      // Expected: should preserve as /catalunya/literatura
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "literatura", // Dynamic category from API
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya/literatura");
    });

    it("should preserve dynamic category 'fires-i-mercats' from byDate", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "fires-i-mercats", // Dynamic category
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya/fires-i-mercats");
    });

    it("should preserve dynamic category 'festes-populars' from byDate", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "festes-populars", // Dynamic category
        rawSearchParams: {},
      });
      expect(url).toBe("/catalunya/festes-populars");
    });

    it("should read category from query params when present", () => {
      // Scenario: /foo?category=literatura
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { category: "literatura" },
      });
      expect(url).toBe("/catalunya/literatura");
    });

    it("should prefer explicit category over query category", () => {
      const url = buildFallbackUrlForInvalidPlace({
        category: "teatre", // Explicit
        rawSearchParams: { category: "literatura" }, // Query param
      });
      expect(url).toBe("/catalunya/teatre");
    });

    it("should prefer query category over derived from byDate", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "festivals", // Could be derived as category
        rawSearchParams: { category: "literatura" }, // But query takes precedence
      });
      expect(url).toBe("/catalunya/literatura");
    });

    it("should prefer explicit category over query category over derived from byDate", () => {
      const url = buildFallbackUrlForInvalidPlace({
        category: "teatre", // Highest priority
        byDate: "festivals", // Could be derived
        rawSearchParams: { category: "literatura" }, // Query param
      });
      expect(url).toBe("/catalunya/teatre");
    });

    it("should handle dynamic category in query params with valid date", () => {
      const url = buildFallbackUrlForInvalidPlace({
        byDate: "avui",
        rawSearchParams: { category: "literatura" },
      });
      expect(url).toBe("/catalunya/avui/literatura");
    });

    it("should handle dynamic category in query params with other query params", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: {
          category: "literatura",
          search: "books",
          distance: "25",
        },
      });
      expect(url).toBe("/catalunya/literatura?search=books&distance=25");
    });

    it("should not treat invalid slug format as category even if in query", () => {
      const url = buildFallbackUrlForInvalidPlace({
        rawSearchParams: { category: "invalid category!" }, // Invalid format
      });
      // Should not include invalid category
      expect(url).toBe("/catalunya");
    });
  });
});
