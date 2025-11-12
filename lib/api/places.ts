import { PlaceResponseDTO } from "types/api/place";
import { createKeyedCache, createCache } from "@lib/api/cache";
import { getInternalApiUrl } from "@utils/api-helpers";
import { cache } from "react";

const placeBySlugCache = createKeyedCache<PlaceResponseDTO | null>(86400000);
const placesCache = createCache<PlaceResponseDTO[]>(86400000);

async function fetchPlaceBySlugApi(
  key: string | number
): Promise<PlaceResponseDTO | null> {
  const slug = String(key);
  const response = await fetch(getInternalApiUrl(`/api/places/${slug}`), {
    next: { revalidate: 86400, tags: ["places", `place:${slug}`] },
  });
  if (response.status === 404) {
    // Place definitively doesn't exist - return null to signal not found
    return null;
  }
  if (!response.ok) {
    // Other errors (500, network, etc.) - throw to distinguish from 404
    throw new Error(`Failed to fetch place ${slug}: HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch place information by slug (universal lookup for provinces, regions, and cities)
 * This replaces the complex multi-step API calls + find operations
 * @param slug - URL slug like "valles-oriental", "barcelona", etc.
 * @returns PlaceResponseDTO with id, type, name, slug
 */
export async function fetchPlaceBySlug(
  slug: string
): Promise<PlaceResponseDTO | null> {
  return placeBySlugCache(slug, fetchPlaceBySlugApi);
}

// Per-request memoized wrapper for metadata + page deduplication
export const getPlaceBySlug = cache(fetchPlaceBySlug);

async function fetchPlacesFromApi(): Promise<PlaceResponseDTO[]> {
  const response = await fetch(getInternalApiUrl(`/api/places`), {
    next: { revalidate: 86400, tags: ["places"] },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

/**
 * Fetch all places (regions, cities, and provinces if available)
 * @returns Array of PlaceResponseDTO
 */
export async function fetchPlaces(): Promise<PlaceResponseDTO[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];
  try {
    return await placesCache(fetchPlacesFromApi);
  } catch (e) {
    console.error("Error fetching places:", e);
    return [];
  }
}
