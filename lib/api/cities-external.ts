import { fetchWithHmac } from "./fetch-wrapper";
import type { CitySummaryResponseDTO } from "types/api/city";
import { parseCities, parseCity } from "lib/validation/city";

// IMPORTANT: Do NOT add `next: { revalidate }` to external fetches.
// This causes OpenNext/SST to create a separate S3+DynamoDB cache entry for every unique URL.
// Use `cache: "no-store"` (fetchWithHmac default) to avoid unbounded cache growth.
// Internal API routes handle caching via Cache-Control headers instead.

export async function fetchCitiesExternal(): Promise<CitySummaryResponseDTO[]> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];
  try {
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    const res = await fetchWithHmac(`${api}/places/cities`);
    if (!res.ok) {
      console.error(`fetchCitiesExternal: HTTP ${res.status}`);
      return [];
    }
    const json = await res.json();
    return parseCities(json);
  } catch (error) {
    console.error("fetchCitiesExternal: failed", error);
    return [];
  }
}

export async function fetchCityByIdExternal(
  id: string | number
): Promise<CitySummaryResponseDTO | null> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return null;
  try {
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    const res = await fetchWithHmac(`${api}/places/cities/${id}`);
    if (!res.ok) {
      console.error("fetchCityByIdExternal:", id, "HTTP", res.status);
      return null;
    }
    const json = await res.json();
    return parseCity(json);
  } catch (error) {
    console.error("fetchCityByIdExternal:", id, "failed", error);
    return null;
  }
}

