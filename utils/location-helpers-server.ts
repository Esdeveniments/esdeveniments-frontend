import { cache } from "react";
import { fetchRegionsWithCities } from "@lib/api/regions";
import { fetchPlaceBySlug } from "@lib/api/places";
import { sanitizeLegacyApostrophe, formatPlaceName } from "./string-helpers";
import type { PlaceTypeAndLabel } from "types/common";

/**
 * Server-only helpers for resolving place slugs to display labels via the
 * regions/places APIs. Kept separate from `utils/location-helpers.ts` so the
 * `@lib/api/*` graph (which depends on `lib/validation/*` and therefore zod)
 * does not leak into client bundles via shared utilities.
 */

export const getPlaceTypeAndLabel = async (
  place: string,
): Promise<PlaceTypeAndLabel> => {
  if (!place || place === "") {
    return { type: "region", label: "Catalunya" };
  }

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

      if (type === "town") {
        try {
          const regionsWithCities = await fetchRegionsWithCities();
          for (const region of regionsWithCities) {
            const city = region.cities.find((c) => c.value === place);
            if (city) {
              return {
                type,
                label: formattedLabel,
                regionLabel: formatPlaceName(region.name),
                regionSlug: region.slug,
              };
            }
          }
        } catch {
          // Region lookup failed, return without region info
        }
      }

      return { type, label: formattedLabel };
    }
  } catch (error) {
    console.error("Error fetching place by slug:", error);
  }

  try {
    const regionsWithCities = await fetchRegionsWithCities();

    const region = regionsWithCities.find(
      (r) =>
        r.slug === place || sanitizeLegacyApostrophe(r.name) === place,
    );
    if (region) {
      return { type: "region", label: formatPlaceName(region.name) };
    }

    for (const region of regionsWithCities) {
      const city = region.cities.find((c) => c.value === place);
      if (city) {
        return {
          type: "town",
          label: formatPlaceName(city.label),
          regionLabel: formatPlaceName(region.name),
          regionSlug: region.slug,
        };
      }
    }
  } catch (error) {
    console.error("Error fetching regions for place lookup:", error);
  }

  return { type: "town", label: formatPlaceName(place.replace(/-/g, " ")) };
};

// Per-request memoized wrapper for server routes
export const getPlaceTypeAndLabelCached = cache(getPlaceTypeAndLabel);
