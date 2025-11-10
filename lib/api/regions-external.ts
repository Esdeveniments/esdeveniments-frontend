import { fetchWithHmac } from "./fetch-wrapper";
import { RegionSummaryResponseDTO } from "types/api/event";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

export async function fetchRegionsExternal(): Promise<RegionSummaryResponseDTO[]> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];
  const res = await fetchWithHmac(`${api}/places/regions`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchRegionsOptionsExternal(): Promise<
  RegionsGroupedByCitiesResponseDTO[]
> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];
  const res = await fetchWithHmac(`${api}/places/regions/options`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchRegionByIdExternal(
  id: string | number
): Promise<RegionSummaryResponseDTO | null> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return null;
  const res = await fetchWithHmac(`${api}/places/regions/${id}`);
  if (!res.ok) return null;
  return res.json();
}

