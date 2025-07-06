import { CitySummaryResponseDTO } from "types/api/city";
import { createCache, createKeyedCache } from "lib/api/cache";

const cache = createCache<CitySummaryResponseDTO[]>(300000);
const cityByIdCache = createKeyedCache<CitySummaryResponseDTO | null>(300000);

async function fetchCitiesFromApi(): Promise<CitySummaryResponseDTO[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/places/cities`
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function fetchCities(): Promise<CitySummaryResponseDTO[]> {
  // Use the cache to fetch cities
  return cache(fetchCitiesFromApi);
}

async function fetchCityByIdApi(
  id: string | number
): Promise<CitySummaryResponseDTO | null> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/places/cities/${id}`
  );
  if (!response.ok) return null;
  return response.json();
}

export async function fetchCityById(
  id: string | number
): Promise<CitySummaryResponseDTO | null> {
  return cityByIdCache(id, fetchCityByIdApi);
}
