import { CitySummaryResponseDTO } from "types/api/city";
import { createCache } from "lib/api/cache";
import { connection } from "next/server";
import { fetchCitiesExternal } from "./cities-external";
import { getSanitizedErrorMessage } from "@utils/api-error-handler";

// fetchCitiesExternal returns [] on failure; storeEmpty: false keeps a failure
// from being cached for a day.
const { cache: citiesListCache, clear: clearCitiesListCache } =
  createCache<CitySummaryResponseDTO[]>(86400000, { storeEmpty: false });

/**
 * Clear the in-memory city cache.
 * Called by the revalidation API to ensure fresh data.
 */
export function clearCitiesCaches(): void {
  clearCitiesListCache();
}

export async function fetchCities(): Promise<CitySummaryResponseDTO[]> {
  try {
    // Keep the request-time signal fetchWithHmac gives on a cache miss, so a
    // warm cache cannot change what Next prerenders.
    await connection();
    return await citiesListCache(fetchCitiesExternal);
  } catch (e) {
    console.error("fetchCities: fetch failed:", getSanitizedErrorMessage(e));
    return [];
  }
}
