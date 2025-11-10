import { fetchWithHmac } from "./fetch-wrapper";
import type { PlaceResponseDTO } from "types/api/place";
import { parsePlace, parsePlaces } from "lib/validation/place";

export async function fetchPlaceBySlugExternal(
  slug: string
): Promise<PlaceResponseDTO | null> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return null;
  try {
    const res = await fetchWithHmac(`${api}/places/${slug}`);
    if (!res.ok) {
      console.error("fetchPlaceBySlugExternal:", slug, "HTTP", res.status);
      return null;
    }
    const json = await res.json();
    return parsePlace(json);
  } catch (error) {
    console.error("fetchPlaceBySlugExternal:", slug, "failed", error);
    return null;
  }
}

export async function fetchPlacesAggregatedExternal(): Promise<
  PlaceResponseDTO[]
> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];
  const endpoints = ["/places/regions", "/places/cities"].map(
    (p) => `${api}${p}`
  );
  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        const response = await fetchWithHmac(endpoint);
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
        return parsePlaces(json);
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
