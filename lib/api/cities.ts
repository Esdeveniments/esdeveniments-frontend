import { CitySummaryResponseDTO } from "types/api/city";

export async function fetchCities(): Promise<CitySummaryResponseDTO[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cities`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function fetchCityById(id: string | number): Promise<CitySummaryResponseDTO | null> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cities/${id}`);
  if (!response.ok) return null;
  return response.json();
}
