import { RegionSummaryResponseDTO } from "types/api/event";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";
import { createCache } from "lib/api/cache";
import { getInternalApiUrl } from "@utils/api-helpers";
import {
  fetchRegionsExternal,
  fetchRegionsOptionsExternal,
} from "./regions-external";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { getSanitizedErrorMessage } from "@utils/api-error-handler";

const { cache: regionsListCache, clear: clearRegionsListCache } =
  createCache<RegionSummaryResponseDTO[]>(86400000);
const { cache: regionsWithCitiesCache, clear: clearRegionsWithCitiesCache } =
  createCache<RegionsGroupedByCitiesResponseDTO[]>(86400000);

/**
 * Clear all in-memory region caches.
 * Called by the revalidation API to ensure fresh data.
 */
export function clearRegionsCaches(): void {
  clearRegionsListCache();
  clearRegionsWithCitiesCache();
}

async function fetchRegionsFromApi(): Promise<RegionSummaryResponseDTO[]> {
  const url = getInternalApiUrl(`/api/regions`);
  const response = await fetch(url, {
    next: { revalidate: 86400, tags: ["regions"] },
  });
  if (!response.ok) {
    const errorText = await response
      .text()
      .catch(() => "Unable to read error response");
    console.error(
      `fetchRegionsFromApi: HTTP error! status: ${response.status}, url: ${url}, error: ${errorText}`
    );
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch all regions (comarques).
 * During build phase (SSG), calls external API directly to avoid internal proxy issues.
 * At runtime (ISR/SSR), uses internal API proxy for better caching and security.
 */
export async function fetchRegions(): Promise<RegionSummaryResponseDTO[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.warn(
      "fetchRegions: NEXT_PUBLIC_API_URL not set, returning empty array"
    );
    return [];
  }

  // During build phase, bypass internal proxy and call external API directly
  // This ensures SSG pages (homepage, sitemap) can fetch data during next build
  // Detection: Check if NEXT_PHASE is set, or if we're in production build context
  // (NEXT_PHASE may not always be set, so we also check for build-time indicators)
  const isBuildPhase =
    process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD ||
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_URL);

  if (isBuildPhase) {
    try {
      return await fetchRegionsExternal();
    } catch (e) {
      // Sanitize error logging to prevent information disclosure
      const errorMessage = getSanitizedErrorMessage(e);
      console.error(
        "fetchRegions: Build phase external fetch failed:",
        errorMessage
      );
      return [];
    }
  }

  // Runtime: use internal API proxy with caching
  // If internal API fails (e.g., during build when server isn't running), fallback to external
  try {
    return await regionsListCache(fetchRegionsFromApi);
  } catch {
    // If internal API fails, try external API as fallback (handles edge cases)
    try {
      return await fetchRegionsExternal();
    } catch (fallbackError) {
      // Sanitize error logging to prevent information disclosure
      const errorMessage = getSanitizedErrorMessage(fallbackError);
      console.error(
        "fetchRegions: Both internal and external API failed:",
        errorMessage
      );
      return [];
    }
  }
}

async function fetchRegionsWithCitiesFromApi(): Promise<
  RegionsGroupedByCitiesResponseDTO[]
> {
  const response = await fetch(getInternalApiUrl(`/api/regions/options`), {
    next: { revalidate: 86400, tags: ["regions", "regions:options"] },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

/**
 * Fetch regions with their associated cities.
 * During build phase, calls external API directly. At runtime, uses internal proxy.
 */
export async function fetchRegionsWithCities(): Promise<
  RegionsGroupedByCitiesResponseDTO[]
> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // During build phase, bypass internal proxy
  // Detection: Check if NEXT_PHASE is set, or if we're in production build context
  const isBuildPhase =
    process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD ||
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_URL);

  if (!apiUrl) {
    if (isBuildPhase) {
      // Fail build if API URL is missing - this is a configuration error
      throw new Error(
        "fetchRegionsWithCities: NEXT_PUBLIC_API_URL not set during build. Cannot proceed without API configuration."
      );
    }

    // Runtime: return empty array if API URL is missing
    console.warn(
      "fetchRegionsWithCities: NEXT_PUBLIC_API_URL not set, returning empty array"
    );
    return [];
  }
  if (isBuildPhase) {
    try {
      const data = await fetchRegionsOptionsExternal();
      if (data.length === 0) {
        console.warn(
          "fetchRegionsWithCities: Build phase fetch returned empty array"
        );
      }
      return data;
    } catch (e) {
      // Sanitize error logging to prevent information disclosure
      const errorMessage = getSanitizedErrorMessage(e);
      console.error(
        "fetchRegionsWithCities: Build phase external fetch failed:",
        errorMessage
      );
      // Fail the build rather than deploying with incomplete/incorrect data
      // This ensures API issues are caught during deployment, not in production
      throw new Error(
        `fetchRegionsWithCities: Build failed due to API error. Cannot proceed with incomplete data. ${errorMessage}`
      );
    }
  }

  // Runtime: use internal API proxy with caching
  try {
    return await regionsWithCitiesCache(fetchRegionsWithCitiesFromApi);
  } catch (e) {
    // Sanitize error logging to prevent information disclosure
    const errorMessage = getSanitizedErrorMessage(e);
    console.error(
      "fetchRegionsWithCities: Runtime internal API fetch failed:",
      errorMessage
    );
    // Return empty array on failure - UI should handle gracefully
    // This is safer than returning incomplete mock data
    return [];
  }
}

export async function fetchRegionById(
  id: string | number
): Promise<RegionSummaryResponseDTO | null> {
  try {
    const response = await fetch(getInternalApiUrl(`/api/regions/${id}`), {
      next: { revalidate: 86400, tags: ["regions", `region:${id}`] },
    });
    if (!response.ok) return null;
    return response.json();
  } catch (e) {
    console.error("Error fetching region by id:", e);
    return null;
  }
}
