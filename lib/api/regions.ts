import { RegionSummaryResponseDTO } from "../../types/api/event";
import { RegionsGroupedByCitiesResponseDTO } from "../../types/api/region";
import { createCache } from "lib/api/cache";

const regionsCache = createCache<RegionSummaryResponseDTO[]>(300000);
const regionsWithCitiesCache = createCache<RegionsGroupedByCitiesResponseDTO[]>(300000);

async function fetchRegionsFromApi(): Promise<RegionSummaryResponseDTO[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/regions`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function fetchRegions(): Promise<RegionSummaryResponseDTO[]> {
  return regionsCache(fetchRegionsFromApi);
}

async function fetchRegionsWithCitiesFromApi(): Promise<RegionsGroupedByCitiesResponseDTO[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/regions/cities`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function fetchRegionsWithCities(): Promise<RegionsGroupedByCitiesResponseDTO[]> {
  return regionsWithCitiesCache(fetchRegionsWithCitiesFromApi);
}

export async function fetchRegionById(id: string | number): Promise<RegionSummaryResponseDTO | null> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/regions/${id}`);
  if (!response.ok) return null;
  return response.json();
}
