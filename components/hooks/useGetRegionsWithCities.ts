import useSWR from "swr";
import { RegionsGroupedByCitiesResponseDTO } from "../../types/api/region";

async function fetcher(): Promise<RegionsGroupedByCitiesResponseDTO[]> {
  // Allow browser/proxy caching based on API response headers
  const res = await fetch("/api/regions/options");
  if (!res.ok) throw new Error("Failed to fetch regions");
  return res.json();
}

export function useGetRegionsWithCities(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<
    RegionsGroupedByCitiesResponseDTO[]
  >(enabled ? "regions-with-cities" : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    revalidateIfStale: true,
    dedupingInterval: 86_400_000, // 24h: data changes rarely, avoid frequent refetches
  });

  return {
    regionsWithCities: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
