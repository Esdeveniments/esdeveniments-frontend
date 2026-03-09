import { describe, it, expect } from "vitest";
import {
  formatPriceLevelGeneric,
  formatAddressLines,
} from "../utils/place-format";

describe("formatPriceLevelGeneric", () => {
  it("formats numeric price level 0 → €", () => {
    expect(formatPriceLevelGeneric(0)).toBe("€");
  });

  it("formats numeric price level 1 → €€", () => {
    expect(formatPriceLevelGeneric(1)).toBe("€€");
  });

  it("formats numeric price level 2 → €€€", () => {
    expect(formatPriceLevelGeneric(2)).toBe("€€€");
  });

  it("formats numeric price level 3 → €€€€", () => {
    expect(formatPriceLevelGeneric(3)).toBe("€€€€");
  });

  it("formats numeric price level 4 → €€€€€", () => {
    expect(formatPriceLevelGeneric(4)).toBe("€€€€€");
  });

  it("clamps negative numbers to €", () => {
    expect(formatPriceLevelGeneric(-1)).toBe("€");
  });

  it("clamps high numbers to €€€€€", () => {
    expect(formatPriceLevelGeneric(10)).toBe("€€€€€");
  });

  it("formats PRICE_LEVEL_FREE string → €", () => {
    expect(formatPriceLevelGeneric("PRICE_LEVEL_FREE")).toBe("€");
  });

  it("formats PRICE_LEVEL_INEXPENSIVE string → €€", () => {
    expect(formatPriceLevelGeneric("PRICE_LEVEL_INEXPENSIVE")).toBe("€€");
  });

  it("formats PRICE_LEVEL_MODERATE string → €€€", () => {
    expect(formatPriceLevelGeneric("PRICE_LEVEL_MODERATE")).toBe("€€€");
  });

  it("formats PRICE_LEVEL_EXPENSIVE string → €€€€", () => {
    expect(formatPriceLevelGeneric("PRICE_LEVEL_EXPENSIVE")).toBe("€€€€");
  });

  it("formats PRICE_LEVEL_VERY_EXPENSIVE string → €€€€€", () => {
    expect(formatPriceLevelGeneric("PRICE_LEVEL_VERY_EXPENSIVE")).toBe("€€€€€");
  });

  it("returns null for unknown string", () => {
    expect(formatPriceLevelGeneric("UNKNOWN")).toBeNull();
  });

  it("returns null for null", () => {
    expect(formatPriceLevelGeneric(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(formatPriceLevelGeneric(undefined)).toBeNull();
  });

  it("returns null for NaN", () => {
    expect(formatPriceLevelGeneric(NaN)).toBeNull();
  });

  it("returns null for boolean", () => {
    expect(formatPriceLevelGeneric(true as any)).toBeNull();
  });
});

describe("formatAddressLines", () => {
  it("joins address lines with comma", () => {
    expect(formatAddressLines(["Carrer Major 1", "Barcelona"])).toBe(
      "Carrer Major 1, Barcelona"
    );
  });

  it("deduplicates segments", () => {
    expect(
      formatAddressLines(["Barcelona", "Barcelona", "08001"])
    ).toBe("Barcelona, 08001");
  });

  it("trims whitespace from segments", () => {
    expect(formatAddressLines(["  Barcelona  ", "  08001  "])).toBe(
      "Barcelona, 08001"
    );
  });

  it("filters out empty segments", () => {
    expect(formatAddressLines(["Barcelona", "", "  ", "08001"])).toBe(
      "Barcelona, 08001"
    );
  });

  it("returns null for null input", () => {
    expect(formatAddressLines(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(formatAddressLines(undefined)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(formatAddressLines([])).toBeNull();
  });

  it("returns null for array of empty strings", () => {
    expect(formatAddressLines(["", "  "])).toBeNull();
  });

  it("handles single line", () => {
    expect(formatAddressLines(["Barcelona"])).toBe("Barcelona");
  });
});
