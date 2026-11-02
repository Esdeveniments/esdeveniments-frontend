import { PlaceResponseDTO } from "types/api/place";
import { createKeyedCache, createCache } from "@lib/api/cache";
import { cache } from "react";
import { connection } from "next/server";
import {
  fetchPlaceBySlugExternal,
  fetchPlacesAggregatedExternal,
} from "./places-external";

// fetchPlaceBySlugExternal returns null only for a real 404 (or a bot slug)
// and throws on errors, so null is cached and errors are not. The aggregate
// throws when an endpoint fails; storeEmpty: false also skips an empty list.
const { cache: placeBySlugCache, clear: clearPlaceBySlugCache } =
  createKeyedCache<PlaceResponseDTO | null>(86400000);
const { cache: placesCache, clear: clearPlacesListCache } =
  createCache<PlaceResponseDTO[]>(86400000, { storeEmpty: false });

/**
 * Clear all in-memory place caches.
 * Called by the revalidation API to ensure fresh data.
 */
export function clearPlacesCaches(): void {
  clearPlaceBySlugCache();
  clearPlacesListCache();
}

/**
 * Fetch place information by slug (universal lookup for provinces, regions, and cities)
 * @param slug - URL slug like "valles-oriental", "barcelona", etc.
 * @returns PlaceResponseDTO with id, type, name, slug
 */
export async function fetchPlaceBySlug(
  slug: string
): Promise<PlaceResponseDTO | null> {
  // Keep the request-time signal fetchWithHmac gives on a cache miss, so a
  // warm cache cannot change what Next prerenders. Errors propagate: callers
  // tell "not found" (null) from a transient failure (throw).
  await connection();
  return placeBySlugCache(slug, (key) => fetchPlaceBySlugExternal(String(key)));
}

// Per-request memoized wrapper for metadata + page deduplication
export const getPlaceBySlug = cache(fetchPlaceBySlug);

/**
 * Fetch all places (regions, cities, and provinces if available)
 * @returns Array of PlaceResponseDTO
 */
export async function fetchPlaces(): Promise<PlaceResponseDTO[]> {
  try {
    await connection();
    return await placesCache(fetchPlacesAggregatedExternal);
  } catch (e) {
    console.error("Error fetching places:", e);
    return [];
  }
}
