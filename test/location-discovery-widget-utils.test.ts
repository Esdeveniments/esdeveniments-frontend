import { describe, it, expect } from "vitest";
import { findNearestCity } from "../components/ui/locationDiscoveryWidget/utils";
import type { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

const regions: RegionsGroupedByCitiesResponseDTO[] = [
  {
    id: 1,
    name: "Barcelonès",
    slug: "barcelones",
    cities: [
      {
        id: 1,
        value: "barcelona",
        label: "Barcelona",
        latitude: 41.3874,
        longitude: 2.1686,
      },
    ],
  },
  {
    id: 2,
    name: "Girona",
    slug: "girona",
    cities: [
      {
        id: 2,
        value: "girona",
        label: "Girona",
        latitude: 41.9794,
        longitude: 2.8214,
      },
    ],
  },
];

describe("findNearestCity", () => {
  it("returns the closest city to the given coordinates", () => {
    const result = findNearestCity(
      { latitude: 41.39, longitude: 2.16 } as GeolocationCoordinates,
      regions
    );
    expect(result).toEqual({ value: "barcelona", label: "Barcelona" });
  });

  it("picks the other city when closer", () => {
    const result = findNearestCity(
      { latitude: 41.98, longitude: 2.82 } as GeolocationCoordinates,
      regions
    );
    expect(result).toEqual({ value: "girona", label: "Girona" });
  });

  it("falls back to Catalunya when there are no cities", () => {
    const result = findNearestCity(
      { latitude: 41.39, longitude: 2.16 } as GeolocationCoordinates,
      []
    );
    expect(result).toEqual({ value: "catalunya", label: "Catalunya" });
  });
});
