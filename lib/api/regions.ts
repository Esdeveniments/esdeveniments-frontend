import { RegionSummaryResponseDTO } from "types/api/event";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";
import { createCache } from "lib/api/cache";

const regionsCache = createCache<RegionSummaryResponseDTO[]>(86400000);
const regionsWithCitiesCache =
  createCache<RegionsGroupedByCitiesResponseDTO[]>(86400000);

async function fetchRegionsFromApi(): Promise<RegionSummaryResponseDTO[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/places/regions`,
    { next: { revalidate: 86400, tags: ["regions"] } }
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function fetchRegions(): Promise<RegionSummaryResponseDTO[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];
  try {
    return await regionsCache(fetchRegionsFromApi);
  } catch (e) {
    console.error("Error fetching regions:", e);
    return [];
  }
}

async function fetchRegionsWithCitiesFromApi(): Promise<
  RegionsGroupedByCitiesResponseDTO[]
> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/places/regions/options`,
    { next: { revalidate: 86400, tags: ["regions", "regions:options"] } }
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function fetchRegionsWithCities(): Promise<
  RegionsGroupedByCitiesResponseDTO[]
> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    // MOCK DATA: fallback for Vercel or missing backend
    return [
      {
        id: 1,
        name: "Barcelona",
        cities: [
          { id: 1, label: "Barcelona", value: "barcelona" },
          { id: 2, label: "Hospitalet", value: "hospitalet" },
        ],
      },
      {
        id: 2,
        name: "Girona",
        cities: [{ id: 1, label: "Girona", value: "girona" }],
      },
    ];
  }
  try {
    return await regionsWithCitiesCache(fetchRegionsWithCitiesFromApi);
  } catch (e) {
    console.error("Error fetching regions with cities:", e);
    // If fetch fails, fallback to mock data
    return [
      {
        id: 1,
        name: "Barcelona",
        cities: [
          { id: 1, label: "Barcelona", value: "barcelona" },
          { id: 2, label: "Hospitalet", value: "hospitalet" },
        ],
      },
      {
        id: 2,
        name: "Girona",
        cities: [{ id: 1, label: "Girona", value: "girona" }],
      },
    ];
  }
}

export async function fetchRegionById(
  id: string | number
): Promise<RegionSummaryResponseDTO | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
  const response = await fetch(`${apiUrl}/places/regions/${id}`, {
    next: { revalidate: 86400, tags: ["regions", `region:${id}`] },
  });
    if (!response.ok) return null;
    return response.json();
  } catch (e) {
    console.error("Error fetching region by id:", e);
    return null;
  }
}
