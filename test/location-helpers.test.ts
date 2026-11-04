import { describe, it, expect } from "vitest";
import {
  buildDisplayLocation,
  buildEventLocationLabels,
  buildEventPlaceLabels,
  buildEventListLocationLabels,
  getDistance,
  deg2rad,
} from "../utils/location-helpers";

describe("buildDisplayLocation", () => {
  it("returns location when no city/region", () => {
    const result = buildDisplayLocation({
      location: "Sala Apolo",
      cityName: "",
      regionName: "",
    });
    expect(result).toBe("Sala Apolo");
  });

  it("appends city name if not already present", () => {
    const result = buildDisplayLocation({
      location: "Sala Apolo",
      cityName: "Barcelona",
      regionName: "",
    });
    expect(result).toBe("Sala Apolo, Barcelona");
  });

  it("appends city and region", () => {
    const result = buildDisplayLocation({
      location: "Sala Apolo",
      cityName: "Barcelona",
      regionName: "Barcelonès",
    });
    expect(result).toBe("Sala Apolo, Barcelona, Barcelonès");
  });

  it("deduplicates segments", () => {
    const result = buildDisplayLocation({
      location: "Barcelona, Barcelona",
      cityName: "Barcelona",
      regionName: "",
    });
    expect(result).toBe("Barcelona");
  });

  it("hides city and region when hidePlaceSegments=true", () => {
    const result = buildDisplayLocation({
      location: "Sala Apolo",
      cityName: "Barcelona",
      regionName: "Barcelonès",
      hidePlaceSegments: true,
    });
    expect(result).toBe("Sala Apolo");
  });

  it("falls back to first unique segment when all hidden", () => {
    const result = buildDisplayLocation({
      location: "Barcelona",
      cityName: "Barcelona",
      regionName: "",
      hidePlaceSegments: true,
    });
    // When location matches city and city is hidden, falls back
    expect(result).toBe("Barcelona");
  });
});

describe("buildEventLocationLabels", () => {
  it("returns city as primary label", () => {
    const result = buildEventLocationLabels({
      cityName: "Barcelona",
      regionName: "Barcelonès",
      location: "Sala Apolo",
    });
    expect(result.primaryLabel).toBe("Barcelona");
    expect(result.cityLabel).toBe("Barcelona");
    expect(result.regionLabel).toBe("Barcelonès");
  });

  it("falls back to region when no city", () => {
    const result = buildEventLocationLabels({
      cityName: "",
      regionName: "Maresme",
      location: "Plaça Major",
    });
    expect(result.primaryLabel).toBe("Maresme");
  });

  it("falls back to venue when no city or region", () => {
    const result = buildEventLocationLabels({
      cityName: "",
      regionName: "",
      location: "Sala Gran",
    });
    expect(result.primaryLabel).toBe("Sala Gran");
  });

  it("returns empty primary when all empty", () => {
    const result = buildEventLocationLabels({
      cityName: "",
      regionName: "",
      location: "",
    });
    expect(result.primaryLabel).toBe("");
  });

  it("uses venue as secondary by default", () => {
    const result = buildEventLocationLabels({
      cityName: "Barcelona",
      regionName: "Barcelonès",
      location: "Sala Apolo",
    });
    expect(result.secondaryLabel).toBe("Sala Apolo");
  });

  it("uses region as secondary when preference is region", () => {
    const result = buildEventLocationLabels({
      cityName: "Barcelona",
      regionName: "Barcelonès",
      location: "Sala Apolo",
      secondaryPreference: "region",
    });
    expect(result.secondaryLabel).toBe("Barcelonès");
  });
});

describe("buildEventPlaceLabels", () => {
  it("returns city as primary and region as secondary", () => {
    const result = buildEventPlaceLabels({
      cityName: "Barcelona",
      regionName: "Barcelonès",
      location: "Sala Apolo",
    });
    expect(result.primaryLabel).toBe("Barcelona");
    expect(result.secondaryLabel).toBe("Barcelonès");
  });

  it("no secondary when city matches region", () => {
    const result = buildEventPlaceLabels({
      cityName: "Barcelona",
      regionName: "Barcelona",
      location: "",
    });
    expect(result.secondaryLabel).toBe("");
  });

  it("falls back to location when no city/region", () => {
    const result = buildEventPlaceLabels({
      cityName: "",
      regionName: "",
      location: "Plaça Major",
    });
    expect(result.primaryLabel).toBe("Plaça Major");
  });
});

describe("buildEventListLocationLabels", () => {
  it("uses location as primary and city+region as secondary", () => {
    const result = buildEventListLocationLabels({
      cityName: "Barcelona",
      regionName: "Barcelonès",
      location: "Sala Apolo",
    });
    expect(result.primaryLabel).toBe("Sala Apolo");
    expect(result.secondaryLabel).toContain("Barcelona");
  });

  it("uses city as primary when no location", () => {
    const result = buildEventListLocationLabels({
      cityName: "Barcelona",
      regionName: "Barcelonès",
      location: "",
    });
    expect(result.primaryLabel).toBe("Barcelona");
  });

  it("returns empty labels when all empty", () => {
    const result = buildEventListLocationLabels({
      cityName: "",
      regionName: "",
      location: "",
    });
    expect(result.primaryLabel).toBe("");
    expect(result.secondaryLabel).toBe("");
  });

  it("deduplicates: location same as city", () => {
    const result = buildEventListLocationLabels({
      cityName: "Barcelona",
      regionName: "Barcelonès",
      location: "Barcelona",
    });
    // Location = city, so secondary should only have region, not city
    expect(result.primaryLabel).toBe("Barcelona");
    expect(result.secondaryLabel).toBe("Barcelonès");
  });
});

describe("getDistance (Haversine)", () => {
  it("returns 0 for same coordinates", () => {
    const loc = { lat: 41.3851, lng: 2.1734 };
    expect(getDistance(loc, loc)).toBe(0);
  });

  it("calculates distance between Barcelona and Madrid (~505 km)", () => {
    const barcelona = { lat: 41.3851, lng: 2.1734 };
    const madrid = { lat: 40.4168, lng: -3.7038 };
    const distance = getDistance(barcelona, madrid);
    expect(distance).toBeGreaterThan(490);
    expect(distance).toBeLessThan(520);
  });

  it("calculates short distance correctly", () => {
    // Barcelona to El Masnou (~15 km)
    const barcelona = { lat: 41.3851, lng: 2.1734 };
    const elMasnou = { lat: 41.4783, lng: 2.3122 };
    const distance = getDistance(barcelona, elMasnou);
    expect(distance).toBeGreaterThan(10);
    expect(distance).toBeLessThan(20);
  });
});

describe("deg2rad", () => {
  it("converts 0 degrees to 0 radians", () => {
    expect(deg2rad(0)).toBe(0);
  });

  it("converts 180 degrees to PI radians", () => {
    expect(deg2rad(180)).toBeCloseTo(Math.PI);
  });

  it("converts 360 degrees to 2*PI radians", () => {
    expect(deg2rad(360)).toBeCloseTo(2 * Math.PI);
  });

  it("converts negative degrees", () => {
    expect(deg2rad(-90)).toBeCloseTo(-Math.PI / 2);
  });
});
