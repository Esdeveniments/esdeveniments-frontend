import { describe, expect, it } from "vitest";
import {
  buildDisplayLocation,
  buildEventLocationLabels,
} from "../utils/location-helpers";

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

describe("buildEventLocationLabels", () => {
  it("uses the city as primary and venue as secondary by default", () => {
    const result = buildEventLocationLabels({
      cityName: "mataro",
      regionName: "maresme",
      location: "teatre monumental",
    });

    expect(result.primaryLabel).toBe("Mataro");
    expect(result.secondaryLabel).toBe("Teatre Monumental");
  });

  it("falls back to region when no city is present", () => {
    const result = buildEventLocationLabels({
      regionName: "maresme",
      location: "plaça gran",
    });

    expect(result.primaryLabel).toBe("Maresme");
    expect(result.secondaryLabel).toBe("Plaça Gran");
  });

  it("can prioritize region as the secondary label", () => {
    const result = buildEventLocationLabels({
      cityName: "vic",
      regionName: "osona",
      location: "recinte firal",
      secondaryPreference: "region",
    });

    expect(result.primaryLabel).toBe("Vic");
    expect(result.secondaryLabel).toBe("Osona");
  });

  it("omits secondary label when venue duplicates the primary text", () => {
    const result = buildEventLocationLabels({
      cityName: "barcelona",
      location: "Barcelona",
    });

    expect(result.primaryLabel).toBe("Barcelona");
    expect(result.secondaryLabel).toBe("");
  });
});
