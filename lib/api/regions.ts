import { RegionSummaryResponseDTO } from "types/api/event";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";
import { createCache } from "lib/api/cache";
import { connection } from "next/server";
import {
  fetchRegionsExternal,
  fetchRegionsOptionsExternal,
} from "./regions-external";
import { getSanitizedErrorMessage } from "@utils/api-error-handler";

// The external fetchers return [] on failure; storeEmpty: false keeps a
// failure from being cached for a day.
const { cache: regionsListCache, clear: clearRegionsListCache } =
  createCache<RegionSummaryResponseDTO[]>(86400000, { storeEmpty: false });
// globalKey: shared with the startup warm-up and /api/revalidate, which are
// bundled apart from the pages.
const { cache: regionsWithCitiesCache, clear: clearRegionsWithCitiesCache } =
  createCache<RegionsGroupedByCitiesResponseDTO[]>(86400000, {
    storeEmpty: false,
    globalKey: "regions-with-cities",
  });

/**
 * Clear all in-memory region caches.
 * Called by the revalidation API to ensure fresh data.
 */
export function clearRegionsCaches(): void {
  clearRegionsListCache();
  clearRegionsWithCitiesCache();
}

/** Fetch all regions (comarques). */
export async function fetchRegions(): Promise<RegionSummaryResponseDTO[]> {
  try {
    // Keep the request-time signal fetchWithHmac gives on a cache miss, so a
    // warm cache cannot change what Next prerenders.
    await connection();
    return await regionsListCache(fetchRegionsExternal);
  } catch (e) {
    console.error("fetchRegions: fetch failed:", getSanitizedErrorMessage(e));
    return [];
  }
}

/** Fetch regions with their associated cities. */
export async function fetchRegionsWithCities(): Promise<
  RegionsGroupedByCitiesResponseDTO[]
> {
  try {
    await connection();
    return await regionsWithCitiesCache(fetchRegionsOptionsExternal);
  } catch (e) {
    console.error(
      "fetchRegionsWithCities: fetch failed:",
      getSanitizedErrorMessage(e),
    );
    return [];
  }
}

/** Fill the cache at server start (instrumentation.ts), outside a request. */
export async function warmRegionsWithCitiesCache(): Promise<void> {
  await regionsWithCitiesCache(() =>
    fetchRegionsOptionsExternal({ skipConnection: true }),
  );
}
