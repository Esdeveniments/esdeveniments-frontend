import { fetchRegionsWithCities } from "@lib/api/regions";
import { fetchPlaceBySlug } from "@lib/api/places";
import { sanitize, formatCatalanDe } from "./string-helpers";
import type { Location, PlaceTypeAndLabel } from "types/common";

export const getPlaceTypeAndLabel = async (
  place: string
): Promise<PlaceTypeAndLabel> => {
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

    const region = regionsWithCities.find((r) => sanitize(r.name) === place);
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
  const text =
    safePlace === "catalunya" ? "Notícies de Catalunya" : `Notícies ${deLabel}`;
  return { href, text };
}
