import useSWR from "swr";
import { fetchRegionsWithCities } from "../../lib/api/regions";
import { RegionsGroupedByCitiesResponseDTO } from "../../types/api/region";

export function useGetRegionsWithCities() {
  const { data, error, isLoading, mutate } = useSWR<RegionsGroupedByCitiesResponseDTO[]>(
    "regions-with-cities",
    fetchRegionsWithCities
  );

  return {
    regionsWithCities: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
