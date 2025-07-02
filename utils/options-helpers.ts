import { sanitize } from "./string-helpers";
import type { Option, GroupedOption } from "types/common";
import type { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

/**
 * Generate regions options sorted alphabetically
 * @param regionsWithCities - Array of regions with cities from API
 * @returns Array of Option objects for regions
 */
export function generateRegionsOptions(
  regionsWithCities: RegionsGroupedByCitiesResponseDTO[]
): Option[] {
  return regionsWithCities
    .map((region) => ({
      value: sanitize(region.name),
      label: region.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Generate towns options for a specific region
 * @param regionsWithCities - Array of regions with cities from API
 * @param regionId - ID of the region to get towns for
 * @returns Array of Option objects for towns in the specified region
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
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : [];
}

/**
 * Generate complete regions and towns options structure
 * Returns "Comarques" group first, followed by towns grouped by regions
 * This matches the structure from the old codebase
 * @param regionsWithCities - Array of regions with cities from API
 * @returns Array of GroupedOption objects
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
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Return with "Comarques" group first, then towns grouped by regions
  return [{ label: "Comarques", options: regionsOptions }, ...townsOptions];
}
