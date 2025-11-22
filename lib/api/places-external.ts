import { fetchWithHmac } from "./fetch-wrapper";
import type { PlaceResponseDTO } from "types/api/place";
import { parsePlace, parsePlaces } from "lib/validation/place";

export async function fetchPlaceBySlugExternal(
  slug: string
): Promise<PlaceResponseDTO | null> {
  // "catalunya" is a frontend-only SEO concept, not a real place in the backend
  // Return null early to avoid unnecessary API calls
  if (slug === "catalunya") {
    return null;
  }

  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return null;
  try {
    const res = await fetchWithHmac(`${api}/places/${slug}`, {
      cache: "no-store",
    });
    if (res.status === 404) {
      // Place definitively doesn't exist - return null to signal not found
      return null;
    }
    if (!res.ok) {
      // Other HTTP errors (500, etc.) - throw to distinguish from 404
      console.error("fetchPlaceBySlugExternal:", slug, "HTTP", res.status);
      throw new Error(`Failed to fetch place ${slug}: HTTP ${res.status}`);
    }
    const json = await res.json();
    return parsePlace(json);
  } catch (error) {
    // Network errors or other exceptions - rethrow to distinguish from 404
    // Only log if it's not already an Error with message (to avoid double logging)
    if (error instanceof Error && error.message.includes("HTTP")) {
      throw error; // Re-throw HTTP errors
    }
    console.error("fetchPlaceBySlugExternal:", slug, "failed", error);
    throw new Error(`Network error fetching place ${slug}: ${error}`);
  }
}

export async function fetchPlacesAggregatedExternal(): Promise<
  PlaceResponseDTO[]
> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];
  const endpoints: Array<{ path: string; type: "REGION" | "CITY" }> = [
    { path: "/places/regions", type: "REGION" },
    { path: "/places/cities", type: "CITY" },
  ];
  const results = await Promise.all(
    endpoints.map(async ({ path, type }) => {
      const endpoint = `${api}${path}`;
      try {
        const response = await fetchWithHmac(endpoint, { cache: "no-store" });
        if (!response.ok) {
          console.error(
            "fetchPlacesAggregatedExternal:",
            endpoint,
            "HTTP",
            response.status
          );
          return [] as PlaceResponseDTO[];
        }
        const json = await response.json();
        // Add type field to each place based on the endpoint
        const placesWithType = Array.isArray(json)
          ? json.map((place: unknown) => ({
              ...(place as Record<string, unknown>),
              type,
            }))
          : [];
        return parsePlaces(placesWithType);
      } catch (error) {
        console.error("Error fetching from", endpoint, error);
        return [] as PlaceResponseDTO[];
      }
    })
  );
  const all = results.flat();
  const map = new Map<string, PlaceResponseDTO>();
  for (const p of all) {
    if (!map.has(p.slug)) map.set(p.slug, p);
  }
  return Array.from(map.values());
}
