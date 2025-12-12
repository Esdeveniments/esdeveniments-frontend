import { describe, expect, it } from "vitest";
import { generateCityOptionsWithRegionMap } from "@utils/options-helpers";

describe("generateCityOptionsWithRegionMap", () => {
  it("creates flat city options and region lookup", () => {
    const regions = [
      {
        id: 1,
        name: "Region One",
        cities: [
          {
            id: 10,
            label: "Town A",
            value: "town-a",
            latitude: 1,
            longitude: 2,
          },
          {
            id: 11,
            label: "Town B",
            value: "town-b",
            latitude: 3,
            longitude: 4,
          },
        ],
      },
      {
        id: 2,
        name: "Region Two",
        cities: [
          {
            id: 20,
            label: "Town C",
            value: "town-c",
            latitude: 5,
            longitude: 6,
          },
        ],
      },
    ];

    const { cityOptions, cityToRegionOptionMap } =
      generateCityOptionsWithRegionMap(regions);

    expect(cityOptions).toHaveLength(3);
    expect(cityOptions.map((c) => c.value)).toEqual(
      expect.arrayContaining(["10", "11", "20"])
    );

    expect(cityToRegionOptionMap["10"].value).toBe("1");
    expect(cityToRegionOptionMap["11"].label).toBe("Region One");
    expect(cityToRegionOptionMap["20"].label).toBe("Region Two");
  });
});


