import { fetchCityById } from "@lib/api/cities";
import { fetchRegionById, fetchRegionsWithCities } from "@lib/api/regions";
import { sanitize } from "./string-helpers";
import type { Location, PlaceTypeAndLabel } from "types/common";

// Updated function that works with slug-based URLs
export const getPlaceTypeAndLabel = async (
  place: string
): Promise<PlaceTypeAndLabel> => {
  // First, try the old ID-based approach for backward compatibility
  if (place && !isNaN(Number(place))) {
    // Try region
    const region = await fetchRegionById(place);
    if (region) return { type: "region", label: region.name };
    // Try city
    const city = await fetchCityById(place);
    if (city) return { type: "town", label: city.name };
  }

  // New slug-based approach: fetch regions with cities and find by slug
  try {
    const regionsWithCities = await fetchRegionsWithCities();

    // Check if it's a region slug (region names are used as slugs)
    const region = regionsWithCities.find((r) => sanitize(r.name) === place);
    if (region) {
      return { type: "region", label: region.name };
    }

    // Check if it's a city slug
    for (const region of regionsWithCities) {
      const city = region.cities.find((c) => c.value === place);
      if (city) {
        return { type: "town", label: city.label };
      }
    }
  } catch (error) {
    console.error("Error fetching regions for place lookup:", error);
  }

  // Fallback
  return { type: "town", label: place };
};

export const getDistance = (
  location1: Location,
  location2: Location
): number => {
  const R = 6371;
  const dLat = deg2rad(location2.lat - location1.lat);
  const dLon = deg2rad(location2.lng - location1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(location1.lat)) *
      Math.cos(deg2rad(location2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};
