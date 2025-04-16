import { RegionSummaryResponseDTO } from "../../types/api/event";
import { RegionsGroupedByCitiesResponseDTO } from "../../types/api/region";

export async function fetchRegions(): Promise<RegionSummaryResponseDTO[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/regions`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function fetchRegionsWithCities(): Promise<RegionsGroupedByCitiesResponseDTO[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/regions/cities`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function fetchRegionById(id: string | number): Promise<RegionSummaryResponseDTO | null> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/regions/${id}`);
  if (!response.ok) return null;
  return response.json();
}
