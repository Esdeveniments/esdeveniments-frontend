import { cache } from "react";
import { fetchRegionsWithCities } from "@lib/api/regions";
import { fetchPlaceBySlug } from "@lib/api/places";
import {
  sanitize,
  sanitizeLegacyApostrophe,
  formatCatalanDe,
} from "./string-helpers";
import type { Location, PlaceTypeAndLabel } from "types/common";
import type { BuildDisplayLocationOptions } from "types/location";

const normalize = (value: string) => value.trim().toLowerCase();

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
    cityName &&
    !uniqueSegments.some((segment) => normalize(segment) === normalize(cityName))
  ) {
    uniqueSegments.push(cityName);
  }

  if (
    regionName &&
    !uniqueSegments.some(
      (segment) => normalize(segment) === normalize(regionName)
    )
  ) {
    uniqueSegments.push(regionName);
  }

  const displaySegments = hidePlaceSegments
    ? uniqueSegments.filter((segment) => {
        const normalized = normalize(segment);
        return (
          normalized !== normalize(cityName || "") &&
          normalized !== normalize(regionName || "")
        );
      })
    : uniqueSegments;

  if (displaySegments.length > 0) {
    return displaySegments.join(", ");
  }

  return uniqueSegments[0] ?? location;
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
      const type =
        placeInfo.type === "CITY"
          ? "town"
          : placeInfo.type === "REGION"
          ? "region"
          : placeInfo.type === "PROVINCE"
          ? "region"
          : "town";
      return { type, label: placeInfo.name };
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
      return { type: "region", label: region.name };
    }

    for (const region of regionsWithCities) {
      const city = region.cities.find((c) => c.value === place);
      if (city) {
        return { type: "town", label: city.label };
      }
    }
  } catch (error) {
    console.error("Error fetching regions for place lookup:", error);
  }

  return { type: "town", label: place };
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

// Build simple News CTA (href + text) without network lookups
// Preference: use provided human label when available, fallback to capitalized slug
export function getNewsCta(
  place: string | undefined,
  placeLabel?: string,
  placeType?: "region" | "town"
): { href: string; text: string } {
  const safePlace = (place || "").trim();
  const href =
    safePlace === "catalunya" || safePlace === ""
      ? "/noticies"
      : `/noticies/${safePlace}`;

  const formatWords = (text: string): string =>
    text
      .split(/\s+/)
      .map((t) =>
        t
          .split("-")
          .map((h) => (h.length ? h.charAt(0).toUpperCase() + h.slice(1) : h))
          .join("-")
      )
      .join(" ");

  const baseLabel =
    safePlace === "catalunya"
      ? "Catalunya"
      : placeLabel
      ? placeLabel
      : formatWords(safePlace.replace(/-/g, " "));

  // Use existing Catalan contraction helper for "de" forms with proper article handling
  // For regions, use article (del/de la/de l'); for towns, no article (de)
  const deLabel = placeType
    ? formatCatalanDe(baseLabel, false, true, placeType)
    : formatCatalanDe(baseLabel, false); // fallback to no article if type unknown

  // CTA copy: Simple and direct news label
  // Fallback to "Catalunya" when place is empty to avoid dangling preposition
  const text =
    safePlace === "catalunya" || safePlace === ""
      ? "Notícies de Catalunya"
      : `Notícies ${deLabel}`;
  return { href, text };
}
