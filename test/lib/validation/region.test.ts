import { describe, it, expect } from "vitest";
import { parseRegionsGrouped } from "@lib/validation/region";

describe("parseRegionsGrouped", () => {
  const validCity = {
    id: 1,
    value: "mataro",
    label: "Mataró",
    latitude: 41.5381,
    longitude: 2.4445,
  };

  it("computes slug from name when API omits slug", () => {
    const apiResponse = [
      { id: 10, name: "Alt Empordà", cities: [validCity] },
      { id: 20, name: "Baix Llobregat", cities: [] },
    ];

    const result = parseRegionsGrouped(apiResponse);

    expect(result).toHaveLength(2);
    expect(result[0]!.slug).toBe("alt-emporda");
    expect(result[1]!.slug).toBe("baix-llobregat");
  });

  it("preserves slug when API provides it", () => {
    const apiResponse = [
      {
        id: 10,
        name: "Alt Empordà",
        slug: "alt-emporda-custom",
        cities: [validCity],
      },
    ];

    const result = parseRegionsGrouped(apiResponse);

    expect(result).toHaveLength(1);
    expect(result[0]!.slug).toBe("alt-emporda-custom");
  });

  it("returns empty array for invalid payload", () => {
    const result = parseRegionsGrouped("not-an-array");
    expect(result).toEqual([]);
  });

  it("returns empty array when items have wrong shape", () => {
    const result = parseRegionsGrouped([{ wrong: "shape" }]);
    expect(result).toEqual([]);
  });

  it("validates city structure within regions", () => {
    const apiResponse = [
      {
        id: 10,
        name: "Garrotxa",
        cities: [{ missing: "fields" }],
      },
    ];

    const result = parseRegionsGrouped(apiResponse);
    expect(result).toEqual([]);
  });

  it("handles empty regions array", () => {
    const result = parseRegionsGrouped([]);
    expect(result).toEqual([]);
  });

  it("handles Catalan diacritics in slug generation", () => {
    const apiResponse = [
      { id: 30, name: "Vallès Occidental", cities: [] },
      { id: 40, name: "Garrigues", cities: [] },
    ];

    const result = parseRegionsGrouped(apiResponse);

    expect(result[0]!.slug).toBe("valles-occidental");
    expect(result[1]!.slug).toBe("garrigues");
  });
});
