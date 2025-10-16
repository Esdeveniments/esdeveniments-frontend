import useSWR from "swr";
import { RegionsGroupedByCitiesResponseDTO } from "../../types/api/region";

async function fetcher(): Promise<RegionsGroupedByCitiesResponseDTO[]> {
  const res = await fetch("/api/regions/options", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch regions");
  return res.json();
}

export function useGetRegionsWithCities() {
  const { data, error, isLoading, mutate } = useSWR<
    RegionsGroupedByCitiesResponseDTO[]
  >("regions-with-cities", fetcher);

  return {
    regionsWithCities: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
