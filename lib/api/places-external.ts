import { fetchWithHmac } from "./fetch-wrapper";
import type { PlaceResponseDTO } from "types/api/place";

export async function fetchPlaceBySlugExternal(
  slug: string
): Promise<PlaceResponseDTO | null> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return null;
  const res = await fetchWithHmac(`${api}/places/${slug}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPlacesAggregatedExternal(): Promise<PlaceResponseDTO[]> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];
  const endpoints = ["/places/regions", "/places/cities"].map((p) => `${api}${p}`);
  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        const response = await fetchWithHmac(endpoint);
        if (!response.ok) return [] as PlaceResponseDTO[];
        return (await response.json()) as PlaceResponseDTO[];
      } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error);
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

