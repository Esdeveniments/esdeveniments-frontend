import { fetchWithHmac } from "./fetch-wrapper";
import { PlaceResponseDTO } from "types/api/place";
import { createKeyedCache, createCache } from "@lib/api/cache";

const placeBySlugCache = createKeyedCache<PlaceResponseDTO | null>(86400000);
const placesCache = createCache<PlaceResponseDTO[]>(86400000);

async function fetchPlaceBySlugApi(
  key: string | number
): Promise<PlaceResponseDTO | null> {
  const slug = String(key);
  const response = await fetchWithHmac(
    `${process.env.NEXT_PUBLIC_API_URL}/places/${slug}`,
    { next: { revalidate: 86400, tags: ["places", `place:${slug}`] } }
  );
  if (!response.ok) return null;
  return response.json();
}

/**
 * Fetch place information by slug (universal lookup for provinces, regions, and cities)
 * This replaces the complex multi-step API calls + find operations
 * @param slug - URL slug like "valles-oriental", "barcelona", etc.
 * @returns PlaceResponseDTO with id, type, name, slug
 */
export async function fetchPlaceBySlug(
  slug: string
): Promise<PlaceResponseDTO | null> {
  return placeBySlugCache(slug, fetchPlaceBySlugApi);
}

async function fetchPlacesFromApi(): Promise<PlaceResponseDTO[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];

  const endpoints = [
    `${apiUrl}/places/regions`,
    `${apiUrl}/places/cities`,
    // Add provinces if they exist: `${apiUrl}/places/provinces`
  ];

  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        const response = await fetchWithHmac(endpoint, {
          next: { revalidate: 86400, tags: ["places"] },
        });
        if (!response.ok) return [];
        const data = (await response.json()) as PlaceResponseDTO[];
        return data;
      } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error);
        return [];
      }
    })
  );

  // Flatten and deduplicate by slug
  const allPlaces = results.flat();
  const uniquePlaces = allPlaces.filter(
    (place: PlaceResponseDTO, index: number, self: PlaceResponseDTO[]) =>
      self.findIndex(
        (candidate: PlaceResponseDTO) => candidate.slug === place.slug
      ) === index
  );
  return uniquePlaces;
}

/**
 * Fetch all places (regions, cities, and provinces if available)
 * @returns Array of PlaceResponseDTO
 */
export async function fetchPlaces(): Promise<PlaceResponseDTO[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];
  try {
    return await placesCache(fetchPlacesFromApi);
  } catch (e) {
    console.error("Error fetching places:", e);
    return [];
  }
}
