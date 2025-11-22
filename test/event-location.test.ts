import { describe, expect, it } from "vitest";
import { buildDisplayLocation } from "../utils/location-helpers";

describe("buildDisplayLocation", () => {
  it("dedupes repeated city and region while keeping venue", () => {
    const result = buildDisplayLocation({
      location: "Museu municipal de Vilassar de Dalt, Vilassar de Dalt, Maresme",
      cityName: "Vilassar de Dalt",
      regionName: "Maresme",
    });

    expect(result).toBe(
      "Museu municipal de Vilassar de Dalt, Vilassar de Dalt, Maresme"
    );
  });

  it("omits city/region from display when links are shown", () => {
    const result = buildDisplayLocation({
      location: "Museu municipal de Vilassar de Dalt, Vilassar de Dalt, Maresme",
      cityName: "Vilassar de Dalt",
      regionName: "Maresme",
      hidePlaceSegments: true,
    });

    expect(result).toBe("Museu municipal de Vilassar de Dalt");
  });

  it("appends missing region and city once when absent", () => {
    const result = buildDisplayLocation({
      location: "Recinte firal",
      cityName: "Vic",
      regionName: "Osona",
    });

    expect(result).toBe("Recinte firal, Vic, Osona");
  });

  it("falls back to first segment when everything else is hidden", () => {
    const result = buildDisplayLocation({
      location: "Mataró",
      cityName: "Mataró",
      regionName: "Maresme",
      hidePlaceSegments: true,
    });

    expect(result).toBe("Mataró");
  });
});
