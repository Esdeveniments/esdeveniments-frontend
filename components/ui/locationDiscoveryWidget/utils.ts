import { Option } from "types/common";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";
import { sanitize } from "@utils/string-helpers";
import { getDistance } from "@utils/location-helpers";

/**
 * Transform regions data to flat Option[] for searchable select
 * Reuses existing Option interface and sanitize function for URL consistency
 */
export function transformRegionsToOptions(
  regions: RegionsGroupedByCitiesResponseDTO[]
): Option[] {
  const options: Option[] = [];

  regions.forEach((region) => {
    // Add region itself as option using API-provided slug (fall back to slugified name)
    options.push({
      value: region.slug ?? sanitize(region.name),
      label: region.name,
    });

    // Add all cities in region (cities already have URL-friendly values)
    region.cities.forEach((city) => {
      options.push({
        value: city.value,
        label: city.label,
      });
    });
  });

  return options;
}

/**
 * Find the closest known city to the given coordinates using straight-line
 * (haversine) distance. Falls back to Catalunya when no cities are available.
 */
export function findNearestCity(
  coordinates: GeolocationCoordinates,
  regions: RegionsGroupedByCitiesResponseDTO[]
): Option | null {
  const origin = { lat: coordinates.latitude, lng: coordinates.longitude };

  let nearest: Option | null = null;
  let nearestDistance = Infinity;

  for (const region of regions) {
    for (const city of region.cities) {
      const distance = getDistance(origin, {
        lat: city.latitude,
        lng: city.longitude,
      });
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = { value: city.value, label: city.label };
      }
    }
  }

  return nearest ?? { value: "catalunya", label: "Catalunya" };
}
