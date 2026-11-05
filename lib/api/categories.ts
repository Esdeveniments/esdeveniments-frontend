import { CategorySummaryResponseDTO } from "types/api/category";
import { createCache } from "lib/api/cache";
import { cache as reactCache } from "react";
import { connection } from "next/server";
import {
  CATEGORIES_LIST_CACHE_KEY,
  fetchCategoriesExternal,
} from "./categories-external";

// fetchCategoriesExternal returns [] on failure; storeEmpty: false keeps a
// failure from being cached for a day. globalKey: shared with proxy.ts, the
// startup warm-up and /api/revalidate, which are bundled apart from the pages.
const { cache: categoriesListCache, clear: clearCategoriesListCache } =
  createCache<CategorySummaryResponseDTO[]>(86400000, {
    storeEmpty: false,
    globalKey: CATEGORIES_LIST_CACHE_KEY,
  });

/**
 * Clear the in-memory category cache.
 * Called by the revalidation API to ensure fresh data.
 */
export function clearCategoriesCaches(): void {
  clearCategoriesListCache();
}

export async function fetchCategories(): Promise<CategorySummaryResponseDTO[]> {
  try {
    // Keep the request-time signal fetchWithHmac gives on a cache miss, so a
    // warm cache cannot change what Next prerenders.
    await connection();
    return await categoriesListCache(fetchCategoriesExternal);
  } catch (e) {
    console.error("Error fetching categories:", e);
    return [];
  }
}

/** Fill the cache at server start (instrumentation.ts), outside a request. */
export async function warmCategoriesCache(): Promise<void> {
  await categoriesListCache(() =>
    fetchCategoriesExternal({ skipConnection: true }),
  );
}

// React per-request memoization for metadata+page deduplication
export const getCategories = reactCache(fetchCategories);
