import type { Option, GroupedOption } from "types/common";
import type { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

/**
 * Generate regions options sorted alphabetically
 * @param regionsWithCities - Array of regions with cities from API
 * @returns Array of Option objects for regions with placeType: "region"
 */
export function generateRegionsOptions(
  regionsWithCities: RegionsGroupedByCitiesResponseDTO[]
): Option[] {
  return regionsWithCities
    .map((region) => ({
      value: region.slug,
      label: region.name,
      placeType: "region" as const,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Generate towns options for a specific region
 * @param regionsWithCities - Array of regions with cities from API
 * @param regionId - ID of the region to get towns for
 * @returns Array of Option objects for towns in the specified region with placeType: "town"
 */
export function generateTownsOptions(
  regionsWithCities: RegionsGroupedByCitiesResponseDTO[],
  regionId: string | number
): Option[] {
  const region = regionsWithCities.find(
    (r) => r.id.toString() === regionId.toString()
  );

  return region
    ? region.cities
        .map((city) => ({
          value: city.value, // Use URL-friendly value instead of ID
          label: city.label,
          placeType: "town" as const,
          // Canonical city fields are latitude/longitude; keep a defensive read
          // of legacy lat/lng inputs but expose only latitude/longitude to the UI.
          latitude: city.latitude ?? (city as { lat?: number }).lat,
          longitude: city.longitude ?? (city as { lng?: number }).lng,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : [];
}

/**
 * Generate a flat list of city options and a lookup map to their regions.
 * Useful when you want a single city selector but still need the region id.
 */
export function generateCityOptionsWithRegionMap(
  regionsWithCities: RegionsGroupedByCitiesResponseDTO[] | null | undefined
): {
  cityOptions: Option[];
  cityToRegionOptionMap: Record<string, Option>;
} {
  if (!regionsWithCities || regionsWithCities.length === 0) {
    return { cityOptions: [], cityToRegionOptionMap: {} };
  }

  const cityToRegionOptionMap: Record<string, Option> = {};

  const cityOptions = regionsWithCities.flatMap((region) => {
    const regionOption: Option = {
      value: region.id.toString(),
      label: region.name,
      placeType: "region",
    };

    return region.cities.map((city) => {
      const cityOption: Option = {
        value: city.id.toString(),
        label: city.label,
        placeType: "town",
        latitude: city.latitude ?? (city as { lat?: number }).lat,
        longitude: city.longitude ?? (city as { lng?: number }).lng,
      };
      cityToRegionOptionMap[city.id.toString()] = regionOption;
      return cityOption;
    });
  });

  return {
    cityOptions: cityOptions.sort((a, b) => a.label.localeCompare(b.label)),
    cityToRegionOptionMap,
  };
}

/**
 * Generate complete regions and towns options structure
 * Returns "Comarques" group first, followed by towns grouped by regions
 * This matches the structure from the old codebase
 * @param regionsWithCities - Array of regions with cities from API
 * @returns Array of GroupedOption objects that include placeType for regions and towns
 */
export function generateRegionsAndTownsOptions(
  regionsWithCities: RegionsGroupedByCitiesResponseDTO[]
): GroupedOption[] {
  if (!regionsWithCities) return [];

  // Create regions options sorted alphabetically
  const regionsOptions = generateRegionsOptions(regionsWithCities);

  // Create towns options grouped by region, sorted alphabetically
  const townsOptions = regionsWithCities
    .map((region) => ({
      label: region.name,
      options: region.cities
        .map((city) => ({
          label: city.label,
          value: city.value, // Use URL-friendly value instead of ID
          placeType: "town" as const,
          latitude: city.latitude ?? (city as { lat?: number }).lat,
          longitude: city.longitude ?? (city as { lng?: number }).lng,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Return with "Comarques" group first, then towns grouped by regions
  return [{ label: "Comarques", options: regionsOptions }, ...townsOptions];
}
