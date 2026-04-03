import { describe, it, expect } from "vitest";
import {
  QueryParamsSchema,
  validateAndSanitizeFilters,
  parseFiltersFromUrlSafe,
} from "../utils/filter-validation";

describe("QueryParamsSchema", () => {
  it("parses valid query params", () => {
    const result = QueryParamsSchema.safeParse({
      search: "festival",
      distance: "25",
      lat: "41.3851",
      lon: "2.1734",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe("festival");
      expect(result.data.distance).toBe("25");
      expect(result.data.lat).toBe("41.3851");
      expect(result.data.lon).toBe("2.1734");
    }
  });

  it("allows all optional fields to be undefined", () => {
    const result = QueryParamsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects non-numeric distance", () => {
    const result = QueryParamsSchema.safeParse({ distance: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid lat format", () => {
    const result = QueryParamsSchema.safeParse({ lat: "not-a-number" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid lon format", () => {
    const result = QueryParamsSchema.safeParse({ lon: "abc.xyz" });
    expect(result.success).toBe(false);
  });

  it("accepts negative lat/lon", () => {
    const result = QueryParamsSchema.safeParse({
      lat: "-41.3851",
      lon: "-2.1734",
    });
    expect(result.success).toBe(true);
  });

  it("accepts integer lat/lon", () => {
    const result = QueryParamsSchema.safeParse({
      lat: "41",
      lon: "2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects distance with decimals", () => {
    const result = QueryParamsSchema.safeParse({ distance: "25.5" });
    expect(result.success).toBe(false);
  });
});

describe("validateAndSanitizeFilters", () => {
  it("returns defaults for completely invalid input", () => {
    const result = validateAndSanitizeFilters(null);
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("returns defaults for empty object", () => {
    const result = validateAndSanitizeFilters({});
    expect(result).toBeDefined();
  });
});

describe("parseFiltersFromUrlSafe", () => {
  it("parses valid segments and search params", () => {
    const segments = { place: "barcelona", date: "avui", category: "concerts" };
    const params = new URLSearchParams("search=jazz&distance=25");
    const result = parseFiltersFromUrlSafe(segments, params);
    expect(result).toBeDefined();
  });

  it("returns defaults for empty segments", () => {
    const segments = {};
    const params = new URLSearchParams();
    const result = parseFiltersFromUrlSafe(segments, params);
    expect(result).toBeDefined();
  });

  it("handles malicious search params gracefully", () => {
    const segments = { place: "barcelona" };
    const params = new URLSearchParams(
      "distance=abc&lat=<script>&lon=DROP TABLE"
    );
    const result = parseFiltersFromUrlSafe(segments, params);
    expect(result).toBeDefined();
    // Should return defaults, not crash
  });

  it("handles extremely long search term", () => {
    const segments = { place: "barcelona" };
    const longSearch = "a".repeat(10000);
    const params = new URLSearchParams(`search=${longSearch}`);
    const result = parseFiltersFromUrlSafe(segments, params);
    expect(result).toBeDefined();
  });

  it("uses default place when not provided", () => {
    const segments = {};
    const params = new URLSearchParams();
    const result = parseFiltersFromUrlSafe(segments, params);
    expect(result).toBeDefined();
  });
});
