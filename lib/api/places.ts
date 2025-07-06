import { PlaceResponseDTO } from "types/api/place";
import { createKeyedCache } from "lib/api/cache";

const placeBySlugCache = createKeyedCache<PlaceResponseDTO | null>(86400000);

async function fetchPlaceBySlugApi(
  key: string | number
): Promise<PlaceResponseDTO | null> {
  const slug = String(key);
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/places/${slug}`
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
