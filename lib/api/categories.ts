import {
  CategoryDetailResponseDTO,
  CategorySummaryResponseDTO,
} from "types/api/category";
import { createCache, createKeyedCache } from "lib/api/cache";
import { getInternalApiUrl, getVercelProtectionBypassHeaders } from "@utils/api-helpers";
import { cache as reactCache } from "react";
import { parseCategories } from "lib/validation/category";
import { isBuildPhase } from "@utils/constants";
import { categoriesTag } from "@lib/cache/tags";
import { cacheLife, cacheTag } from "next/cache";
import {
  fetchCategoriesExternal,
  fetchCategoryByIdExternal,
} from "./categories-external";

const { cache: categoriesListCache, clear: clearCategoriesListCache } =
  createCache<CategorySummaryResponseDTO[]>(86400000);
const { cache: categoryByIdCache, clear: clearCategoryByIdCache } =
  createKeyedCache<CategoryDetailResponseDTO | null>(86400000);

/**
 * Clear all in-memory category caches.
 * Called by the revalidation API to ensure fresh data.
 */
export function clearCategoriesCaches(): void {
  clearCategoriesListCache();
  clearCategoryByIdCache();
}

async function fetchCategoriesFromApi(): Promise<CategorySummaryResponseDTO[]> {
  const url = await getInternalApiUrl(`/api/categories`);
  const response = await fetch(url, {
    headers: getVercelProtectionBypassHeaders(),
    next: { revalidate: 86400, tags: ["categories"] },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const json = await response.json();
  return parseCategories(json);
}

export async function fetchCategories(): Promise<CategorySummaryResponseDTO[]> {
  // During build, bypass internal API (server not running) and call external directly
  if (isBuildPhase) {
    try {
      return await fetchCategoriesExternal();
    } catch (error) {
      console.error("fetchCategories: external fetch failed during build", error);
      return [];
    }
  }
  try {
    return await categoriesListCache(fetchCategoriesFromApi);
  } catch (e) {
    console.error("Error fetching categories:", e);
    return [];
  }
}

// React per-request memoization for metadata+page deduplication
export const getCategories = reactCache(fetchCategories);

// Metadata-only reader: resolves the API origin from configuration instead of
// request headers(), and is itself cached, so generateMetadata stays
// prerenderable under cacheComponents. See
// docs/incidents/2026-06-13-cachecomponents-metadata-resume-mismatch.md.
export async function fetchCategoriesForMetadata(): Promise<
  CategorySummaryResponseDTO[]
> {
  "use cache";
  cacheTag(categoriesTag);
  const url = await getInternalApiUrl(`/api/categories`, {
    preferConfiguredOrigin: true,
  });
  const response = await fetch(url, {
    headers: getVercelProtectionBypassHeaders(),
    next: { revalidate: 86400, tags: ["categories"] },
  });
  if (!response.ok) {
    // Categories are a fallback enrichment for metadata copy, not the
    // primary lookup — degrade to empty rather than throw.
    return [];
  }
  cacheLife("hours");
  const json = await response.json();
  return parseCategories(json);
}

async function fetchCategoryByIdApi(
  id: string | number
): Promise<CategoryDetailResponseDTO | null> {
  const url = await getInternalApiUrl(`/api/categories/${id}`);
  const response = await fetch(url, {
    headers: getVercelProtectionBypassHeaders(),
    next: { revalidate: 86400, tags: ["categories", `category:${id}`] },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function fetchCategoryById(
  id: string | number
): Promise<CategoryDetailResponseDTO | null> {
  // During build, bypass internal API (server not running) and call external directly
  if (isBuildPhase) {
    try {
      return await fetchCategoryByIdExternal(id);
    } catch (error) {
      console.error("fetchCategoryById: external fetch failed during build", error);
      return null;
    }
  }
  try {
    return await categoryByIdCache(id, fetchCategoryByIdApi);
  } catch (e) {
    console.error("Error fetching category by id:", e);
    return null;
  }
}
