import { describe, it, expect } from "vitest";
import {
  buildCanonicalUrlDynamic,
  parseFiltersFromUrl,
  urlToFilterState,
  getRedirectUrl,
  isValidCategorySlug,
  toUrlSearchParams,
} from "../utils/url-filters";

describe("url-filters: canonical building and parsing", () => {
  it("omits tots date and category when both default", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: "tots",
      category: "tots",
    });
    expect(url).toBe("/barcelona");
  });

  it("omits tots date when category is specific", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: "tots",
      category: "concerts",
    });
    expect(url).toBe("/barcelona/concerts");
  });

  it("keeps date when category is tots", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: "avui",
      category: "tots",
    });
    expect(url).toBe("/barcelona/avui");
  });

  it("includes search and non-default distance as query", () => {
    const url = buildCanonicalUrlDynamic({
      place: "barcelona",
      byDate: "avui",
      category: "tots",
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
      date: "tots",
      category: "tots",
    });

    const twoDate = parseFiltersFromUrl(
      { place: "catalunya", date: "avui" },
      new URLSearchParams("")
    );
    expect(twoDate.segments).toEqual({
      place: "catalunya",
      date: "avui",
      category: "tots",
    });

    const twoCat = parseFiltersFromUrl(
      { place: "catalunya", category: "concerts" },
      new URLSearchParams("")
    );
    expect(twoCat.segments).toEqual({
      place: "catalunya",
      date: "tots",
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
      byDate: "tots",
      category: "tots",
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
    // invalid date/category should normalize to tots/tots -> /tarragona
    expect(redirect).toBe("/tarragona");
  });

  it("redirects /place/invalid-category to /place", () => {
    // No dynamic categories provided -> unknown category normalizes to 'tots'
    const parsed = parseFiltersFromUrl(
      { place: "barcelona", category: "not-a-category" },
      new URLSearchParams("")
    );
    expect(parsed.isCanonical).toBe(false);
    const redirect = getRedirectUrl(parsed);
    expect(redirect).toBe("/barcelona");
  });

  it("redirects /place/date/invalid-category to /place/date", () => {
    // Unknown category with valid date -> category becomes 'tots' and is omitted
    const parsed = parseFiltersFromUrl(
      { place: "barcelona", date: "avui", category: "not-a-category" },
      new URLSearchParams("")
    );
    expect(parsed.isCanonical).toBe(false);
    const redirect = getRedirectUrl(parsed);
    expect(redirect).toBe("/barcelona/avui");
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
      date: "tots",
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
      category: "tots",
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
      date: "tots",
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
      { place: "barcelona", date: "tots" },
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
      { place: "barcelona", date: "tots", category: "teatre" },
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
      { place: "barcelona", date: "tots" },
      new URLSearchParams("search=castellers"),
      []
    );
    expect(parsed.isCanonical).toBe(false);
    const redirect = getRedirectUrl(parsed);
    expect(redirect).toBe("/barcelona?search=castellers");
  });
});

describe("url-filters: category slug validation", () => {
  it("accepts legacy category slugs and tots by default", () => {
    expect(isValidCategorySlug("concerts")).toBe(true);
    expect(isValidCategorySlug("tots")).toBe(true);
  });

  it("accepts dynamic categories when provided", () => {
    const dynamic = [{ id: 1, name: "Fires", slug: "fires-i-mercats" }];
    expect(isValidCategorySlug("fires-i-mercats", dynamic)).toBe(true);
  });

  it("rejects unknown categories when not present dynamically", () => {
    expect(isValidCategorySlug("unknown-slug")).toBe(false);
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
});
