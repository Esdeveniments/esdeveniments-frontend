// Metadata-only readers for place/region lookups. Kept out of lib/api/places.ts,
// lib/api/regions.ts, and utils/location-helpers.ts because those files are
// transitively reachable from Client Components (via utils/helpers.ts ->
// utils/url-filters.ts -> UrlFiltersContext.tsx), and Next.js forbids defining
// an inline `"use cache"` function in a file that can be pulled into a client
// bundle. See docs/incidents/2026-06-13-cachecomponents-metadata-resume-mismatch.md.
import { cacheLife, cacheTag } from "next/cache";
import { PlaceResponseDTO } from "types/api/place";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";
import type { PlaceTypeAndLabel } from "types/common";
import {
  getInternalApiUrl,
  getVercelProtectionBypassHeaders,
} from "@utils/api-helpers";
import { placesTag, placeTag, regionsTag, regionsOptionsTag } from "@lib/cache/tags";
import { resolvePlaceTypeAndLabel } from "@utils/location-helpers";

// Resolves the API origin from configuration instead of request headers(), so
// generateMetadata stays prerenderable under cacheComponents. Mirrors
// fetchCategoriesForMetadata / getNewsBySlugForMetadata.
export async function fetchPlaceBySlugForMetadata(
  slug: string,
): Promise<PlaceResponseDTO | null> {
  "use cache";
  cacheTag(placesTag, placeTag(slug));
  const encodedSlug = encodeURIComponent(slug);
  const url = await getInternalApiUrl(`/api/places/${encodedSlug}`, {
    preferConfiguredOrigin: true,
  });
  const response = await fetch(url, {
    headers: getVercelProtectionBypassHeaders(),
    next: { revalidate: 86400, tags: [placesTag, placeTag(slug)] },
  });
  if (response.status === 404) {
    // Genuine 404: cache briefly so a newly-created place isn't stuck on
    // "not found" metadata for hours. "minutes" not "seconds" — seconds is a
    // PPR dynamic hole and would re-break the static shell. Mirrors
    // getNewsBySlugForMetadata / getEventBySlugForMetadata.
    cacheLife("minutes");
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch place ${slug}: HTTP ${response.status}`);
  }
  cacheLife("hours");
  return response.json();
}

export async function fetchRegionsWithCitiesForMetadata(): Promise<
  RegionsGroupedByCitiesResponseDTO[]
> {
  "use cache";
  cacheTag(regionsTag, regionsOptionsTag);
  const url = await getInternalApiUrl(`/api/regions/options`, {
    preferConfiguredOrigin: true,
  });
  const response = await fetch(url, {
    headers: getVercelProtectionBypassHeaders(),
    next: { revalidate: 86400, tags: [regionsTag, regionsOptionsTag] },
  });
  if (!response.ok) {
    cacheLife("minutes");
    return [];
  }
  cacheLife("hours");
  return response.json();
}

export async function getPlaceTypeAndLabelForMetadata(
  place: string,
): Promise<PlaceTypeAndLabel> {
  "use cache";
  cacheTag(placesTag, regionsTag, regionsOptionsTag);
  cacheLife("hours");
  return resolvePlaceTypeAndLabel(
    place,
    fetchPlaceBySlugForMetadata,
    fetchRegionsWithCitiesForMetadata,
  );
}
