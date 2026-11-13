import { describe, it, expect } from "vitest";
import {
  buildCanonicalUrlDynamic,
  parseFiltersFromUrl,
  urlToFilterState,
  getRedirectUrl,
  isValidCategorySlug,
  toUrlSearchParams,
  getCategorySlug,
  hasActiveClientFilters,
} from "../utils/url-filters";
import { DEFAULT_FILTER_VALUE, MAX_QUERY_PARAMS } from "../utils/constants";
import type { CategorySummaryResponseDTO } from "../types/api/category";

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

  it("includes search and lat/lon as query parameters", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: "avui",
      category: DEFAULT_FILTER_VALUE,
      searchTerm: "concerts",
      lat: 41.3888,
      lon: 2.159,
    });
    expect(url).toContain("/barcelona/avui?");
    expect(url).toContain("search=concerts");
    expect(url).toContain("lat=41.3888");
    expect(url).toContain("lon=2.159");
  });

  it("includes search, distance, lat, and lon all together", () => {
    const url = buildCanonicalUrlDynamic({
      place: "catalunya",
      byDate: DEFAULT_FILTER_VALUE,
      category: DEFAULT_FILTER_VALUE,
      searchTerm: "castellers",
      distance: 30,
      lat: 41.643119809884865,
      lon: 2.3563432607664034,
    });
    expect(url).toContain("/catalunya?");
    expect(url).toContain("search=castellers");
    expect(url).toContain("distance=30");
    expect(url).toContain("lat=41.643119809884865");
    expect(url).toContain("lon=2.3563432607664034");
  });

  it("parses 1, 2 and 3 segments correctly", () => {
    const one = parseFiltersFromUrl(
      { place: "catalunya" },
      new URLSearchParams(""),
    );
    expect(one.segments).toEqual({
      place: "catalunya",
      date: DEFAULT_FILTER_VALUE,
      category: DEFAULT_FILTER_VALUE,
    });

    const twoDate = parseFiltersFromUrl(
      { place: "catalunya", date: "avui" },
      new URLSearchParams(""),
    );
    expect(twoDate.segments).toEqual({
      place: "catalunya",
      date: "avui",
      category: DEFAULT_FILTER_VALUE,
    });

    const twoCat = parseFiltersFromUrl(
      { place: "catalunya", category: "concerts" },
      new URLSearchParams(""),
    );
    expect(twoCat.segments).toEqual({
      place: "catalunya",
      date: DEFAULT_FILTER_VALUE,
      category: "concerts",
    });

    const three = parseFiltersFromUrl(
      { place: "mataro", date: "avui", category: "concerts" },
      new URLSearchParams("search=art"),
    );
    expect(three.segments).toEqual({
      place: "mataro",
      date: "avui",
      category: "concerts",
    });
    expect(three.queryParams.search).toBe("art");
  });

  it("urlToFilterState converts parsed filters and preserves defaults for numbers", () => {
    const parsed = parseFiltersFromUrl(
      { place: "lleida" },
      new URLSearchParams(""),
    );
    const state = urlToFilterState(parsed);
    expect(state).toEqual({
      place: "lleida",
      byDate: DEFAULT_FILTER_VALUE,
      category: DEFAULT_FILTER_VALUE,
      searchTerm: "",
      distance: 50,
      price: DEFAULT_FILTER_VALUE,
      lat: undefined,
      lon: undefined,
    });
  });

  it("parseFiltersFromUrl extracts calendar from/to query params", () => {
    const parsed = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("from=2026-03-15&to=2026-03-15"),
    );
    expect(parsed.queryParams.from).toBe("2026-03-15");
    expect(parsed.queryParams.to).toBe("2026-03-15");
  });

  it("buildCanonicalUrlDynamic includes from/to as query params", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: DEFAULT_FILTER_VALUE,
      category: DEFAULT_FILTER_VALUE,
      from: "2026-03-15",
      to: "2026-03-15",
    });
    expect(url).toBe("/barcelona?from=2026-03-15&to=2026-03-15");
  });

  it("buildCanonicalUrlDynamic omits from/to when undefined", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: DEFAULT_FILTER_VALUE,
      category: DEFAULT_FILTER_VALUE,
    });
    expect(url).toBe("/barcelona");
  });

  it("buildCanonicalUrlDynamic includes price as query param", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: DEFAULT_FILTER_VALUE,
      category: DEFAULT_FILTER_VALUE,
      price: "gratis",
    });
    expect(url).toBe("/barcelona?price=gratis");
  });

  it("buildCanonicalUrlDynamic omits default price", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: DEFAULT_FILTER_VALUE,
      category: DEFAULT_FILTER_VALUE,
      price: DEFAULT_FILTER_VALUE,
    });
    expect(url).toBe("/barcelona");
  });

  it("buildCanonicalUrlDynamic includes price with other query params", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: "avui",
      category: DEFAULT_FILTER_VALUE,
      searchTerm: "jazz",
      price: "pagament",
    });
    expect(url).toBe("/barcelona/avui?search=jazz&price=pagament");
  });

  it("buildCanonicalUrlDynamic omits byDate when explicit from/to are present", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: "avui",
      category: DEFAULT_FILTER_VALUE,
      from: "2026-03-15",
      to: "2026-03-15",
    });
    expect(url).toBe("/barcelona?from=2026-03-15&to=2026-03-15");
  });

  it("buildCanonicalUrlDynamic includes price with from/to", () => {
    const url = buildCanonicalUrlDynamic({
      place: "girona",
      byDate: DEFAULT_FILTER_VALUE,
      category: "concerts",
      price: "gratis",
      from: "2026-04-01",
      to: "2026-04-07",
    });
    expect(url).toBe(
      "/girona/concerts?price=gratis&from=2026-04-01&to=2026-04-07",
    );
  });

  it("parseFiltersFromUrl extracts price from query params", () => {
    const parsed = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("price=gratis"),
    );
    expect(parsed.queryParams.price).toBe("gratis");
  });

  it("parseFiltersFromUrl extracts price with from/to together", () => {
    const parsed = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("price=pagament&from=2026-05-01&to=2026-05-15"),
    );
    expect(parsed.queryParams.price).toBe("pagament");
    expect(parsed.queryParams.from).toBe("2026-05-01");
    expect(parsed.queryParams.to).toBe("2026-05-15");
  });

  it("urlToFilterState includes price when present", () => {
    const parsed = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("price=gratis"),
    );
    const state = urlToFilterState(parsed);
    expect(state.price).toBe("gratis");
  });

  it("urlToFilterState defaults price to DEFAULT_FILTER_VALUE when absent", () => {
    const parsed = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams(""),
    );
    const state = urlToFilterState(parsed);
    expect(state.price).toBe(DEFAULT_FILTER_VALUE);
  });

  it("urlToFilterState includes from/to when present", () => {
    const parsed = parseFiltersFromUrl(
      { place: "girona" },
      new URLSearchParams("from=2026-06-01&to=2026-06-01"),
    );
    const state = urlToFilterState(parsed);
    expect(state.from).toBe("2026-06-01");
    expect(state.to).toBe("2026-06-01");
  });

  it("getRedirectUrl returns canonical URL when parsed is not canonical", () => {
    const parsed = parseFiltersFromUrl(
      { place: "tarragona", date: "xx", category: "yy" },
      new URLSearchParams(""),
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
      new URLSearchParams(""),
    );
    expect(parsed.isCanonical).toBe(false);
    const redirect = getRedirectUrl(parsed);
    expect(redirect).toBe("/barcelona");
  });

  it("preserves format-valid category when dynamic categories not provided", () => {
    // Format-valid category is preserved (will be validated at runtime)
    const parsed = parseFiltersFromUrl(
      { place: "barcelona", category: "not-a-category" }, // Valid format
      new URLSearchParams(""),
    );
    // Without dynamic categories, format-valid slugs are accepted
    expect(parsed.isCanonical).toBe(true);
  });

  it("redirects /place/date/invalid-format-category to /place/date", () => {
    // Invalid format category with valid date -> category becomes 'tots' and is omitted
    const parsed = parseFiltersFromUrl(
      { place: "barcelona", date: "avui", category: "not a category!" }, // Invalid format
      new URLSearchParams(""),
    );
    expect(parsed.isCanonical).toBe(false);
    const redirect = getRedirectUrl(parsed);
    expect(redirect).toBe("/barcelona/avui");
  });

  it("preserves format-valid category with date when dynamic categories not provided", () => {
    // Format-valid category is preserved (will be validated at runtime)
    const parsed = parseFiltersFromUrl(
      { place: "barcelona", date: "avui", category: "not-a-category" }, // Valid format
      new URLSearchParams(""),
    );
    // Without dynamic categories, format-valid slugs are accepted
    expect(parsed.isCanonical).toBe(true);
  });

  it("reads category from query params when only place segment exists", () => {
    const dynamicCategories = [{ id: 1, name: "Teatre", slug: "teatre" }];
    const parsed = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("category=teatre"),
      dynamicCategories,
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
      new URLSearchParams("date=avui"),
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
      dynamicCategories,
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
      new URLSearchParams("category=concerts"),
    );
    expect(withCategory.isCanonical).toBe(false);

    const withDate = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("date=avui"),
    );
    expect(withDate.isCanonical).toBe(false);

    const withBoth = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("category=concerts&date=avui"),
    );
    expect(withBoth.isCanonical).toBe(false);
  });

  it("getRedirectUrl redirects query params to canonical path", () => {
    // Test case from E2E: /barcelona?category=teatre&date=tots -> /barcelona/teatre
    const dynamicCategories = [{ id: 1, name: "Teatre", slug: "teatre" }];
    const parsed = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("category=teatre&date=tots"),
      dynamicCategories,
    );
    const redirect = getRedirectUrl(parsed);
    expect(redirect).toBe("/barcelona/teatre");
  });

  it("preserves search query params when redirecting from query params", () => {
    const dynamicCategories = [{ id: 1, name: "Teatre", slug: "teatre" }];
    const parsed = parseFiltersFromUrl(
      { place: "barcelona" },
      new URLSearchParams("category=teatre&date=tots&search=castellers"),
      dynamicCategories,
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
      dynamicCategories,
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
      [],
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
      dynamicCategories,
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
      [],
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
      const manyValues = Array.from(
        { length: MAX_QUERY_PARAMS + 10 },
        (_, i) => `value${i}`,
      );
      const raw = { foo: manyValues };
      const params = toUrlSearchParams(raw);

      // Should only append MAX_QUERY_PARAMS values, not all of them
      expect(params.getAll("foo").length).toBe(MAX_QUERY_PARAMS);
      expect(params.getAll("foo")[0]).toBe("value0");
      expect(params.getAll("foo")[MAX_QUERY_PARAMS - 1]).toBe(
        `value${MAX_QUERY_PARAMS - 1}`,
      );
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
      expect(params.get(`key${MAX_QUERY_PARAMS - 1}`)).toBe(
        `value${MAX_QUERY_PARAMS - 1}`,
      );
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

describe("url-filters: getCategorySlug", () => {
  const mockCategories: CategorySummaryResponseDTO[] = [
    { id: 1, name: "Teatre", slug: "teatre" },
    { id: 2, name: "Concerts", slug: "concerts" },
    { id: 3, name: "Fires i Mercats", slug: "fires-i-mercats" },
    { id: 4, name: "Festes Populars", slug: "festes-populars" },
    { id: 5, name: "Literatura", slug: "literatura" },
  ];

  describe("early returns for empty/null/default values", () => {
    it("returns DEFAULT_FILTER_VALUE for empty string", () => {
      expect(getCategorySlug("")).toBe(DEFAULT_FILTER_VALUE);
    });

    it("returns DEFAULT_FILTER_VALUE for null", () => {
      expect(getCategorySlug(null as any)).toBe(DEFAULT_FILTER_VALUE);
    });

    it("returns DEFAULT_FILTER_VALUE for undefined", () => {
      expect(getCategorySlug(undefined as any)).toBe(DEFAULT_FILTER_VALUE);
    });

    it("returns DEFAULT_FILTER_VALUE when category is DEFAULT_FILTER_VALUE", () => {
      expect(getCategorySlug(DEFAULT_FILTER_VALUE)).toBe(DEFAULT_FILTER_VALUE);
    });

    it("returns DEFAULT_FILTER_VALUE for empty string even with dynamic categories", () => {
      expect(getCategorySlug("", mockCategories)).toBe(DEFAULT_FILTER_VALUE);
    });

    it("returns DEFAULT_FILTER_VALUE for null even with dynamic categories", () => {
      expect(getCategorySlug(null as any, mockCategories)).toBe(
        DEFAULT_FILTER_VALUE,
      );
    });
  });

  describe("dynamic category lookup by name (case-insensitive)", () => {
    it("finds category by exact name match", () => {
      expect(getCategorySlug("Teatre", mockCategories)).toBe("teatre");
    });

    it("finds category by name case-insensitive (lowercase)", () => {
      expect(getCategorySlug("teatre", mockCategories)).toBe("teatre");
    });

    it("finds category by name case-insensitive (uppercase)", () => {
      expect(getCategorySlug("TEATRE", mockCategories)).toBe("teatre");
    });

    it("finds category by name case-insensitive (mixed case)", () => {
      expect(getCategorySlug("TeAtRe", mockCategories)).toBe("teatre");
    });

    it("finds category with spaces in name", () => {
      expect(getCategorySlug("Fires i Mercats", mockCategories)).toBe(
        "fires-i-mercats",
      );
    });

    it("finds category with spaces in name (case-insensitive)", () => {
      expect(getCategorySlug("FIRES I MERCATS", mockCategories)).toBe(
        "fires-i-mercats",
      );
    });

    it("finds category with spaces in name (mixed case)", () => {
      expect(getCategorySlug("Fires I Mercats", mockCategories)).toBe(
        "fires-i-mercats",
      );
    });

    it("finds category with accented characters in name", () => {
      expect(getCategorySlug("Festes Populars", mockCategories)).toBe(
        "festes-populars",
      );
    });
  });

  describe("dynamic category lookup by slug (exact match)", () => {
    it("finds category by exact slug match", () => {
      expect(getCategorySlug("teatre", mockCategories)).toBe("teatre");
    });

    it("finds category by exact slug match with hyphens", () => {
      expect(getCategorySlug("fires-i-mercats", mockCategories)).toBe(
        "fires-i-mercats",
      );
    });

    it("finds category by exact slug match with multiple hyphens", () => {
      expect(getCategorySlug("festes-populars", mockCategories)).toBe(
        "festes-populars",
      );
    });
  });

  describe("dynamic category lookup by slug (case-insensitive)", () => {
    it("finds category by slug case-insensitive (uppercase)", () => {
      expect(getCategorySlug("TEATRE", mockCategories)).toBe("teatre");
    });

    it("finds category by slug case-insensitive (mixed case)", () => {
      expect(getCategorySlug("TeAtRe", mockCategories)).toBe("teatre");
    });

    it("finds category by slug case-insensitive with hyphens", () => {
      expect(getCategorySlug("FIRES-I-MERCATS", mockCategories)).toBe(
        "fires-i-mercats",
      );
    });

    it("finds category by slug case-insensitive with hyphens (mixed case)", () => {
      expect(getCategorySlug("Fires-I-Mercats", mockCategories)).toBe(
        "fires-i-mercats",
      );
    });
  });

  describe("format validation fallback when no dynamic match found", () => {
    it("returns category as-is when format is valid and no dynamic categories", () => {
      expect(getCategorySlug("valid-slug")).toBe("valid-slug");
    });

    it("returns category as-is when format is valid and dynamic categories don't match", () => {
      expect(getCategorySlug("unknown-slug", mockCategories)).toBe(
        "unknown-slug",
      );
    });

    it("returns category as-is for valid format with numbers", () => {
      expect(getCategorySlug("category123", mockCategories)).toBe(
        "category123",
      );
    });

    it("returns category as-is for valid format with hyphens", () => {
      expect(getCategorySlug("test-category-slug", mockCategories)).toBe(
        "test-category-slug",
      );
    });

    it("returns category as-is for valid format with multiple hyphens", () => {
      expect(getCategorySlug("test---category", mockCategories)).toBe(
        "test---category",
      );
    });

    it("returns category as-is for single character valid slug", () => {
      expect(getCategorySlug("a", mockCategories)).toBe("a");
    });

    it("returns category as-is for numeric slug", () => {
      expect(getCategorySlug("123", mockCategories)).toBe("123");
    });
  });

  describe("edge cases and special characters", () => {
    it("normalizes invalid format with spaces when no dynamic match", () => {
      // Invalid format (has spaces) - should be sanitized to valid slug
      expect(getCategorySlug("invalid category", mockCategories)).toBe(
        "invalid-category",
      );
    });

    it("normalizes invalid format with special characters", () => {
      // Invalid format with special characters - should be sanitized
      expect(getCategorySlug("category!", mockCategories)).toBe("category");
    });

    it("returns category as-is for invalid format with uppercase when no match", () => {
      // "Concerts" (uppercase) doesn't match name "Concerts" exactly
      // but should match via case-insensitive name matching
      expect(getCategorySlug("Concerts", mockCategories)).toBe("concerts");
    });

    it("handles empty dynamic categories array", () => {
      expect(getCategorySlug("teatre", [])).toBe("teatre");
    });

    it("handles undefined dynamic categories", () => {
      expect(getCategorySlug("teatre", undefined)).toBe("teatre");
    });

    it("handles null dynamic categories", () => {
      expect(getCategorySlug("teatre", null as any)).toBe("teatre");
    });

    it("handles non-array dynamic categories", () => {
      expect(getCategorySlug("teatre", {} as any)).toBe("teatre");
    });
  });

  describe("priority of matching strategies", () => {
    it("prefers name match over slug match when both match", () => {
      // If a category has name "teatre" and slug "teatre", both match
      // The find() will return the first match, which should be correct
      const categories: CategorySummaryResponseDTO[] = [
        { id: 1, name: "Teatre", slug: "teatre" },
      ];
      expect(getCategorySlug("teatre", categories)).toBe("teatre");
    });

    it("handles category where name differs from slug", () => {
      const categories: CategorySummaryResponseDTO[] = [
        { id: 1, name: "Fires i Mercats", slug: "fires-i-mercats" },
      ];
      // Match by name
      expect(getCategorySlug("Fires i Mercats", categories)).toBe(
        "fires-i-mercats",
      );
      // Match by slug
      expect(getCategorySlug("fires-i-mercats", categories)).toBe(
        "fires-i-mercats",
      );
    });
  });

  describe("mixed case scenarios", () => {
    it("handles mixed case category name", () => {
      expect(getCategorySlug("CoNcErTs", mockCategories)).toBe("concerts");
    });

    it("handles mixed case slug", () => {
      expect(getCategorySlug("TeAtRe", mockCategories)).toBe("teatre");
    });

    it("handles mixed case with hyphens", () => {
      expect(getCategorySlug("FiReS-i-MeRcAtS", mockCategories)).toBe(
        "fires-i-mercats",
      );
    });
  });

  describe("real-world category scenarios", () => {
    it("handles typical category lookup by name", () => {
      expect(getCategorySlug("Teatre", mockCategories)).toBe("teatre");
    });

    it("handles typical category lookup by slug", () => {
      expect(getCategorySlug("teatre", mockCategories)).toBe("teatre");
    });

    it("handles category with special name format", () => {
      expect(getCategorySlug("Fires i Mercats", mockCategories)).toBe(
        "fires-i-mercats",
      );
    });

    it("handles category with accented characters", () => {
      expect(getCategorySlug("Festes Populars", mockCategories)).toBe(
        "festes-populars",
      );
    });

    it("handles unknown category gracefully", () => {
      expect(getCategorySlug("unknown-category", mockCategories)).toBe(
        "unknown-category",
      );
    });
  });

  describe("security: path traversal and injection prevention", () => {
    it("normalizes path traversal attempts to safe slug", () => {
      // Path traversal attempts are sanitized to safe slugs (slashes removed)
      const result = getCategorySlug("../../../etc/passwd", mockCategories);
      expect(result).toBe("etcpasswd");
      // Verify it's a valid slug format (no path traversal possible)
      expect(result).toMatch(/^[a-z0-9-]+$/);
    });

    it("normalizes category with slashes to safe slug", () => {
      expect(getCategorySlug("category/with/slashes", mockCategories)).toBe(
        "categorywithslashes",
      );
    });

    it("normalizes category with query parameters", () => {
      // Query parameters are sanitized (removed or converted to safe chars)
      const result = getCategorySlug("category?param=value", mockCategories);
      expect(result).toBe("categoryparamvalue");
      expect(result).toMatch(/^[a-z0-9-]+$/);
    });

    it("normalizes category with hash fragments", () => {
      expect(getCategorySlug("category#fragment", mockCategories)).toBe(
        "categoryfragment",
      );
    });

    it("normalizes category with percent-encoded sequences", () => {
      // Percent-encoded sequences are sanitized
      const result = getCategorySlug("category%2Fpath", mockCategories);
      expect(result).toBe("category2fpath");
      expect(result).toMatch(/^[a-z0-9-]+$/);
    });

    it("normalizes category with null bytes", () => {
      expect(getCategorySlug("category\0null", mockCategories)).toBe(
        "categorynull",
      );
    });

    it("normalizes category with unicode control characters", () => {
      expect(getCategorySlug("category\u0000\u0001", mockCategories)).toBe(
        "category",
      );
    });

    it("returns DEFAULT_FILTER_VALUE for category that sanitizes to empty", () => {
      // Category that sanitizes to empty or invalid should return default
      expect(getCategorySlug("!!!", mockCategories)).toBe(DEFAULT_FILTER_VALUE);
    });

    it("normalizes category with mixed unsafe characters", () => {
      // Mixed unsafe characters are sanitized to safe slug
      const result = getCategorySlug("cat/egory?test#frag", mockCategories);
      expect(result).toBe("categorytestfrag");
      expect(result).toMatch(/^[a-z0-9-]+$/);
    });

    it("handles category with only special characters", () => {
      // Special characters are sanitized (e.g., & becomes " i ")
      const result = getCategorySlug("!@#$%^&*()", mockCategories);
      // Result may be a short valid slug or DEFAULT_FILTER_VALUE
      expect(
        result === DEFAULT_FILTER_VALUE || /^[a-z0-9-]+$/.test(result),
      ).toBe(true);
    });

    it("validates found category slug is safe before returning", () => {
      // Even if a category is found, validate its slug is safe
      const unsafeCategories: CategorySummaryResponseDTO[] = [
        { id: 1, name: "Unsafe", slug: "../../etc" },
      ];
      // Slug "../../etc" is not a valid format, so should return DEFAULT_FILTER_VALUE
      // However, if it gets sanitized to "unsafe" or similar, that's also acceptable
      const result = getCategorySlug("Unsafe", unsafeCategories);
      // Either DEFAULT_FILTER_VALUE or a valid sanitized slug
      expect(
        result === DEFAULT_FILTER_VALUE || /^[a-z0-9-]+$/.test(result),
      ).toBe(true);
      // Ensure no path traversal characters remain
      expect(result).not.toContain("/");
      expect(result).not.toContain("..");
    });

    it("handles category with missing name or slug in dynamic categories", () => {
      const incompleteCategories: CategorySummaryResponseDTO[] = [
        { id: 1, name: "", slug: "valid-slug" },
        { id: 2, name: "Valid", slug: "" },
        { id: 3, name: "Valid", slug: "valid-slug" },
      ];
      // Should skip categories with missing name or slug
      expect(getCategorySlug("Valid", incompleteCategories)).toBe("valid-slug");
    });
  });
});

describe("url-filters: hasActiveClientFilters", () => {
  it("returns false when no query params are set", () => {
    expect(hasActiveClientFilters({})).toBe(false);
  });

  it("returns false when all params are undefined", () => {
    expect(
      hasActiveClientFilters({
        search: undefined,
        distance: undefined,
        price: undefined,
        from: undefined,
        lat: undefined,
        lon: undefined,
      }),
    ).toBe(false);
  });

  it("returns true when search is set", () => {
    expect(hasActiveClientFilters({ search: "concert" })).toBe(true);
  });

  it("returns true when distance is set", () => {
    expect(hasActiveClientFilters({ distance: "10" })).toBe(true);
  });

  it("returns true when price is set", () => {
    expect(hasActiveClientFilters({ price: "gratis" })).toBe(true);
  });

  it.each(["tots", "junk"])("returns false for price %j", (price) => {
    expect(hasActiveClientFilters({ price })).toBe(false);
  });

  it("returns true when calendar from is set", () => {
    expect(hasActiveClientFilters({ from: "2026-03-13" })).toBe(true);
  });

  it("returns true when calendar to is set", () => {
    expect(hasActiveClientFilters({ to: "2026-03-20" })).toBe(true);
  });

  it("returns true when lat is set", () => {
    expect(hasActiveClientFilters({ lat: "41.3851" })).toBe(true);
  });

  it("returns true when lon is set", () => {
    expect(hasActiveClientFilters({ lon: "2.1734" })).toBe(true);
  });

  it("returns true when multiple filters are active", () => {
    expect(
      hasActiveClientFilters({
        search: "jazz",
        price: "gratis",
        from: "2026-04-01",
      }),
    ).toBe(true);
  });

  it("returns false when params are empty strings", () => {
    expect(
      hasActiveClientFilters({ search: "", distance: "", price: "" }),
    ).toBe(false);
  });

  it("returns false when price is the default value 'tots'", () => {
    expect(hasActiveClientFilters({ price: "tots" })).toBe(false);
  });
});
