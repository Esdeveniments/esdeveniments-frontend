import { fetchWithHmac } from "./fetch-wrapper";
import type { CitySummaryResponseDTO } from "types/api/city";
import { parseCities, parseCity } from "lib/validation/city";

export async function fetchCitiesExternal(): Promise<CitySummaryResponseDTO[]> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];
  try {
    const res = await fetchWithHmac(`${api}/places/cities`, { cache: "no-store" });
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
    const res = await fetchWithHmac(`${api}/places/cities/${id}`, {
      cache: "no-store",
    });
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

