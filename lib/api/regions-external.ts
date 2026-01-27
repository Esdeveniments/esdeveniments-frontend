import { fetchWithHmac } from "./fetch-wrapper";
import { RegionSummaryResponseDTO } from "types/api/event";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

// IMPORTANT: Do NOT add `next: { revalidate }` to external fetches.
// This causes OpenNext/SST to create a separate S3+DynamoDB cache entry for every unique URL.
// Use `cache: "no-store"` (fetchWithHmac default) to avoid unbounded cache growth.
// Internal API routes handle caching via Cache-Control headers instead.

export async function fetchRegionsExternal(): Promise<
  RegionSummaryResponseDTO[]
> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];
  try {
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    const res = await fetchWithHmac(`${api}/places/regions`);
    if (!res.ok) {
      console.error(`fetchRegionsExternal: HTTP ${res.status}`);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error("fetchRegionsExternal: failed", error);
    return [];
  }
}

export async function fetchRegionsOptionsExternal(): Promise<
  RegionsGroupedByCitiesResponseDTO[]
> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];
  try {
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    const res = await fetchWithHmac(`${api}/places/regions/options`);
    if (!res.ok) {
      console.error(`fetchRegionsOptionsExternal: HTTP ${res.status}`);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error("fetchRegionsOptionsExternal: failed", error);
    return [];
  }
}

export async function fetchRegionByIdExternal(
  id: string | number
): Promise<RegionSummaryResponseDTO | null> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return null;
  try {
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    const res = await fetchWithHmac(`${api}/places/regions/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("fetchRegionByIdExternal:", id, "failed", error);
    return null;
  }
}
