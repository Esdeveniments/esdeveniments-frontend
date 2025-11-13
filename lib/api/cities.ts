import { CitySummaryResponseDTO } from "types/api/city";
import { createCache, createKeyedCache } from "lib/api/cache";
import { getInternalApiUrl } from "@utils/api-helpers";

const cache = createCache<CitySummaryResponseDTO[]>(86400000);
const cityByIdCache = createKeyedCache<CitySummaryResponseDTO | null>(86400000);

async function fetchCitiesFromApi(): Promise<CitySummaryResponseDTO[]> {
  const url = getInternalApiUrl(`/api/cities`);
  const response = await fetch(url, {
    next: { revalidate: 86400, tags: ["cities"] },
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unable to read error response");
    console.error(
      `fetchCitiesFromApi: HTTP error! status: ${response.status}, url: ${url}, error: ${errorText}`
    );
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchCities(): Promise<CitySummaryResponseDTO[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];
  try {
    return await cache(fetchCitiesFromApi);
  } catch (e) {
    console.error("Error fetching cities:", e);
    return [];
  }
}

async function fetchCityByIdApi(
  id: string | number
): Promise<CitySummaryResponseDTO | null> {
  const response = await fetch(getInternalApiUrl(`/api/cities/${id}`), {
    next: { revalidate: 86400, tags: ["cities", `city:${id}`] },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function fetchCityById(
  id: string | number
): Promise<CitySummaryResponseDTO | null> {
  try {
    return await cityByIdCache(id, fetchCityByIdApi);
  } catch (e) {
    console.error("Error fetching city by id:", e);
    return null;
  }
}
