import { fetchWithHmac } from "./fetch-wrapper";
import type { CitySummaryResponseDTO } from "types/api/city";

export async function fetchCitiesExternal(): Promise<CitySummaryResponseDTO[]> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];
  const res = await fetchWithHmac(`${api}/places/cities`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchCityByIdExternal(
  id: string | number
): Promise<CitySummaryResponseDTO | null> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return null;
  const res = await fetchWithHmac(`${api}/places/cities/${id}`);
  if (!res.ok) return null;
  return res.json();
}

