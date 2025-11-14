import { RegionSummaryResponseDTO } from "types/api/event";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";
import { createCache } from "lib/api/cache";
import { getInternalApiUrl } from "@utils/api-helpers";
import {
  fetchRegionsExternal,
  fetchRegionsOptionsExternal,
} from "./regions-external";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const regionsCache = createCache<RegionSummaryResponseDTO[]>(86400000);
const regionsWithCitiesCache =
  createCache<RegionsGroupedByCitiesResponseDTO[]>(86400000);

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
      const data = await fetchRegionsExternal();
      if (data.length === 0) {
        console.warn("fetchRegions: Build phase fetch returned empty array");
      }
      return data;
    } catch (e) {
      console.error("fetchRegions: Build phase external fetch failed:", e);
      if (e instanceof Error) {
        console.error("Error details:", e.message, e.stack);
      }
      return [];
    }
  }

  // Runtime: use internal API proxy with caching
  // If internal API fails (e.g., during build when server isn't running), fallback to external
  try {
    return await regionsCache(fetchRegionsFromApi);
  } catch (e) {
    // If internal API fails, try external API as fallback (handles edge cases)
    console.warn(
      "fetchRegions: Internal API failed, trying external API as fallback"
    );
    try {
      const data = await fetchRegionsExternal();
      return data;
    } catch (fallbackError) {
      // Avoid logging raw error objects (may contain sensitive data).
      // Log only the error message or a stringified value to reduce exposure of stack traces or internal context.
      if (fallbackError instanceof Error) {
        console.error(
          "fetchRegions: Both internal and external API failed:",
          fallbackError.message
        );
      } else {
        console.error(
          "fetchRegions: Both internal and external API failed:",
          String(fallbackError)
        );
      }
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
  if (!apiUrl) {
    console.warn(
      "fetchRegionsWithCities: NEXT_PUBLIC_API_URL not set, returning mock data"
    );
    // MOCK DATA: fallback for Vercel or missing backend
    return [
      {
        id: 1,
        name: "Barcelona",
        cities: [
          { id: 1, label: "Barcelona", value: "barcelona" },
          { id: 2, label: "Hospitalet", value: "hospitalet" },
        ],
      },
      {
        id: 2,
        name: "Girona",
        cities: [{ id: 1, label: "Girona", value: "girona" }],
      },
    ];
  }

  // During build phase, bypass internal proxy
  const isBuildPhase = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;
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
      console.error(
        "fetchRegionsWithCities: Build phase external fetch failed:",
        e
      );
      if (e instanceof Error) {
        console.error("Error details:", e.message, e.stack);
      }
      // Fallback to mock data on build failure
      return [
        {
          id: 1,
          name: "Barcelona",
          cities: [
            { id: 1, label: "Barcelona", value: "barcelona" },
            { id: 2, label: "Hospitalet", value: "hospitalet" },
          ],
        },
        {
          id: 2,
          name: "Girona",
          cities: [{ id: 1, label: "Girona", value: "girona" }],
        },
      ];
    }
  }

  // Runtime: use internal API proxy with caching
  try {
    return await regionsWithCitiesCache(fetchRegionsWithCitiesFromApi);
  } catch (e) {
    console.error(
      "fetchRegionsWithCities: Runtime internal API fetch failed:",
      e
    );
    if (e instanceof Error) {
      console.error("Error details:", e.message, e.stack);
    }
    // If fetch fails, fallback to mock data
    return [
      {
        id: 1,
        name: "Barcelona",
        cities: [
          { id: 1, label: "Barcelona", value: "barcelona" },
          { id: 2, label: "Hospitalet", value: "hospitalet" },
        ],
      },
      {
        id: 2,
        name: "Girona",
        cities: [{ id: 1, label: "Girona", value: "girona" }],
      },
    ];
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
