import { Option } from "types/common";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

/**
 * Transform regions data to flat Option[] for searchable select
 * Reuses existing Option interface and sanitize function for URL consistency
 */
export function transformRegionsToOptions(
  regions: RegionsGroupedByCitiesResponseDTO[]
): Option[] {
  const options: Option[] = [];

  regions.forEach((region) => {
    // Add region itself as option using API-provided slug
    options.push({
      value: region.slug,
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
 * Find nearest city using coordinates
 * For now, returns Catalunya as fallback - can be enhanced with actual mapping
 */
export function findNearestCity(
  _coordinates: GeolocationCoordinates,
  _regions: RegionsGroupedByCitiesResponseDTO[]
): Option | null {
  // TODO: Implement actual coordinate-to-city mapping logic
  // For now, return Catalunya as fallback
  return { value: "catalunya", label: "Catalunya" };
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (..._args: unknown[]) => void>(
  func: T,
  wait: number
): (..._args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
