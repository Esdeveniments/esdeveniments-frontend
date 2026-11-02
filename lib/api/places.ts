import { PlaceResponseDTO } from "types/api/place";
import { createKeyedCache, createCache } from "@lib/api/cache";
import { cache } from "react";
import { connection } from "next/server";
import {
  fetchPlaceBySlugExternal,
  fetchPlacesAggregatedExternal,
} from "./places-external";

// The external fetchers return null/[] on failure; storeEmpty: false keeps a
// failure from being cached for a day.
const { cache: placeBySlugCache, clear: clearPlaceBySlugCache } =
  createKeyedCache<PlaceResponseDTO | null>(86400000, { storeEmpty: false });
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
  try {
    // Keep the request-time signal fetchWithHmac gives on a cache miss, so a
    // warm cache cannot change what Next prerenders.
    await connection();
    return await placeBySlugCache(slug, (key) =>
      fetchPlaceBySlugExternal(String(key))
    );
  } catch (error) {
    console.error("fetchPlaceBySlug: fetch failed", error);
    return null;
  }
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
