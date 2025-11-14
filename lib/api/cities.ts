import { CitySummaryResponseDTO } from "types/api/city";
import { createCache, createKeyedCache } from "lib/api/cache";
import { getInternalApiUrl } from "@utils/api-helpers";
import { fetchCitiesExternal } from "./cities-external";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const cache = createCache<CitySummaryResponseDTO[]>(86400000);
const cityByIdCache = createKeyedCache<CitySummaryResponseDTO | null>(86400000);

async function fetchCitiesFromApi(): Promise<CitySummaryResponseDTO[]> {
  const url = getInternalApiUrl(`/api/cities`);
  const response = await fetch(url, {
    next: { revalidate: 86400, tags: ["cities"] },
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unable to read error response");
    console.error(
      `fetchCitiesFromApi: HTTP error! status: ${response.status}, url: ${url}, error: ${errorText}`
    );
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch all cities.
 * During build phase (SSG), calls external API directly to avoid internal proxy issues.
 * At runtime (ISR/SSR), uses internal API proxy for better caching and security.
 */
export async function fetchCities(): Promise<CitySummaryResponseDTO[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.warn("fetchCities: NEXT_PUBLIC_API_URL not set, returning empty array");
    return [];
  }

  // During build phase, bypass internal proxy and call external API directly
  // This ensures SSG pages (sitemap) can fetch data during next build
  // Detection: Check if NEXT_PHASE is set, or if we're in production build context
  const isBuildPhase =
    process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD ||
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_URL);

  if (isBuildPhase) {
    try {
      return await fetchCitiesExternal();
    } catch (e) {
      // Sanitize error logging to prevent information disclosure
      const errorMessage =
        e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
      console.error("fetchCities: Build phase external fetch failed:", errorMessage);
      return [];
    }
  }

  // Runtime: use internal API proxy with caching
  // If internal API fails (e.g., during build when server isn't running), fallback to external
  try {
    return await cache(fetchCitiesFromApi);
  } catch {
    // If internal API fails, try external API as fallback (handles edge cases)
    try {
      return await fetchCitiesExternal();
    } catch (fallbackError) {
      // Sanitize error logging to prevent information disclosure
      const errorMessage =
        fallbackError instanceof Error
          ? fallbackError.message
          : typeof fallbackError === "string"
            ? fallbackError
            : "Unknown error";
      console.error(
        "fetchCities: Both internal and external API failed:",
        errorMessage
      );
      return [];
    }
  }
}

async function fetchCityByIdApi(
  id: string | number
): Promise<CitySummaryResponseDTO | null> {
  const response = await fetch(getInternalApiUrl(`/api/cities/${id}`), {
    next: { revalidate: 86400, tags: ["cities", `city:${id}`] },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function fetchCityById(
  id: string | number
): Promise<CitySummaryResponseDTO | null> {
  try {
    return await cityByIdCache(id, fetchCityByIdApi);
  } catch (e) {
    console.error("Error fetching city by id:", e);
    return null;
  }
}
