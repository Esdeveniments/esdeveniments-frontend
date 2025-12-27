import { cache } from "react";
import { fetchRegionsWithCities } from "@lib/api/regions";
import { fetchPlaceBySlug } from "@lib/api/places";
import {
  sanitize,
  sanitizeLegacyApostrophe,
  formatPlaceName,
} from "./string-helpers";
import type { Location, PlaceTypeAndLabel } from "types/common";
import type {
  BuildDisplayLocationOptions,
  EventLocationLabelOptions,
  EventLocationLabels,
  EventPlaceLabelOptions,
  EventPlaceLabels,
  EventListLocationLabelOptions,
  EventListLocationLabels,
} from "types/location";

const normalize = (value: string) => value.trim().toLowerCase();
const formatOptionalPlace = (value?: string | null) =>
  value && value.trim().length > 0 ? formatPlaceName(value) : "";
const isDistinctLabel = (candidate: string, ...others: string[]): boolean => {
  if (!candidate) return false;
  const normalizedCandidate = normalize(candidate);
  return !others.some(
    (other) => other && normalize(other) === normalizedCandidate
  );
};

/**
 * Build a clean location string:
 * - Deduplicate comma-separated segments
 * - Append city/region if missing
 * - Optionally hide city/region when separate links are displayed
 */
export const buildDisplayLocation = ({
  location,
  cityName,
  regionName,
  hidePlaceSegments,
}: BuildDisplayLocationOptions): string => {
  const formattedCityName = formatOptionalPlace(cityName);
  const formattedRegionName = formatOptionalPlace(regionName);

  const baseSegments = location
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const uniqueSegments = baseSegments.reduce<string[]>((acc, segment) => {
    const key = normalize(segment);
    if (!acc.some((existing) => normalize(existing) === key)) {
      acc.push(segment);
    }
    return acc;
  }, []);

  if (
    formattedCityName &&
    !uniqueSegments.some(
      (segment) => normalize(segment) === normalize(formattedCityName)
    )
  ) {
    uniqueSegments.push(formattedCityName);
  }

  if (
    formattedRegionName &&
    !uniqueSegments.some(
      (segment) => normalize(segment) === normalize(formattedRegionName)
    )
  ) {
    uniqueSegments.push(formattedRegionName);
  }

  const displaySegments = hidePlaceSegments
    ? uniqueSegments.filter((segment) => {
        const normalized = normalize(segment);
        return (
          normalized !== normalize(formattedCityName || "") &&
          normalized !== normalize(formattedRegionName || "")
        );
      })
    : uniqueSegments;

  if (displaySegments.length > 0) {
    return displaySegments.join(", ");
  }

  return uniqueSegments[0] ?? location;
};

export const buildEventLocationLabels = ({
  cityName,
  regionName,
  location,
  secondaryPreference = "venue",
}: EventLocationLabelOptions): EventLocationLabels => {
  const cityLabel = formatOptionalPlace(cityName);
  const regionLabel = formatOptionalPlace(regionName);
  const venueLabel = formatOptionalPlace(location);

  const primaryLabel = cityLabel || regionLabel || venueLabel || "";
  const preferRegion = secondaryPreference === "region";
  const preferredSecondary = preferRegion ? regionLabel : venueLabel;
  const fallbackSecondary = preferRegion ? venueLabel : regionLabel;

  let secondaryLabel = "";
  if (isDistinctLabel(preferredSecondary, primaryLabel)) {
    secondaryLabel = preferredSecondary;
  } else if (
    isDistinctLabel(fallbackSecondary, primaryLabel, preferredSecondary)
  ) {
    secondaryLabel = fallbackSecondary;
  }

  return {
    cityLabel,
    regionLabel,
    venueLabel,
    primaryLabel,
    secondaryLabel,
  };
};

/**
 * Build place and region labels for list views (events list, categorized events, related events).
 * Prioritizes city and region, excluding the venue/location field which may be generic
 * (e.g., "Biblioteca Municipal" with no additional context).
 * Falls back to location if city and region are both missing.
 */
export const buildEventPlaceLabels = ({
  cityName,
  regionName,
  location,
}: EventPlaceLabelOptions): EventPlaceLabels => {
  const cityLabel = formatOptionalPlace(cityName);
  const regionLabel = formatOptionalPlace(regionName);
  const venueLabel = formatOptionalPlace(location);

  // Prioritize city and region, but fall back to location if both are missing
  const primaryLabel = cityLabel || regionLabel || venueLabel || "";
  const secondaryLabel =
    cityLabel && regionLabel && isDistinctLabel(regionLabel, cityLabel)
      ? regionLabel
      : "";

  return {
    cityLabel,
    regionLabel,
    primaryLabel,
    secondaryLabel,
  };
};

/**
 * Build location labels for event list cards.
 * Shows location first, then city and region combined, since list cards have more space.
 * Always shows all available and distinct values.
 */
export const buildEventListLocationLabels = ({
  cityName,
  regionName,
  location,
}: EventListLocationLabelOptions): EventListLocationLabels => {
  const cityLabel = formatOptionalPlace(cityName);
  const regionLabel = formatOptionalPlace(regionName);
  const locationLabel = formatOptionalPlace(location);

  // Primary: location (if available), otherwise city, otherwise region
  // Secondary: city and region combined (if distinct from primary)
  let primaryLabel = "";
  const secondaryParts: string[] = [];

  if (locationLabel) {
    // Location exists - use it as primary
    primaryLabel = locationLabel;
    // Add city and region to secondary if they're distinct from location
    if (cityLabel && isDistinctLabel(cityLabel, locationLabel)) {
      secondaryParts.push(cityLabel);
    }
    if (regionLabel && isDistinctLabel(regionLabel, locationLabel)) {
      secondaryParts.push(regionLabel);
    }
  } else if (cityLabel) {
    // No location, but city exists - use city as primary
    primaryLabel = cityLabel;
    // Add region to secondary if distinct from city
    if (regionLabel && isDistinctLabel(regionLabel, cityLabel)) {
      secondaryParts.push(regionLabel);
    }
  } else if (regionLabel) {
    // Only region exists
    primaryLabel = regionLabel;
  }

  // Combine secondary parts with comma
  const secondaryLabel =
    secondaryParts.length > 0 ? secondaryParts.join(", ") : "";

  return {
    cityLabel,
    regionLabel,
    locationLabel,
    primaryLabel,
    secondaryLabel,
  };
};

export const getPlaceTypeAndLabel = async (
  place: string
): Promise<PlaceTypeAndLabel> => {
  // "catalunya" is a frontend-only SEO concept, not a real place in the backend
  // Return early without making API calls
  if (place === "catalunya") {
    return { type: "region", label: "Catalunya" };
  }

  try {
    const placeInfo = await fetchPlaceBySlug(place);
    if (placeInfo) {
      const formattedLabel = formatPlaceName(placeInfo.name);
      const type =
        placeInfo.type === "CITY"
          ? "town"
          : placeInfo.type === "REGION"
          ? "region"
          : placeInfo.type === "PROVINCE"
          ? "region"
          : "town";
      return { type, label: formattedLabel };
    }
  } catch (error) {
    console.error("Error fetching place by slug:", error);
  }

  try {
    const regionsWithCities = await fetchRegionsWithCities();

    const region = regionsWithCities.find(
      (r) =>
        sanitize(r.name) === place || sanitizeLegacyApostrophe(r.name) === place
    );
    if (region) {
      return { type: "region", label: formatPlaceName(region.name) };
    }

    for (const region of regionsWithCities) {
      const city = region.cities.find((c) => c.value === place);
      if (city) {
        return { type: "town", label: formatPlaceName(city.label) };
      }
    }
  } catch (error) {
    console.error("Error fetching regions for place lookup:", error);
  }

  return { type: "town", label: formatPlaceName(place.replace(/-/g, " ")) };
};

// Per-request memoized wrapper for server routes
export const getPlaceTypeAndLabelCached = cache(getPlaceTypeAndLabel);

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
