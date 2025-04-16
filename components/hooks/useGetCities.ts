import useSWR from "swr";
import { fetchCities } from "../../lib/api/cities";
import { CitySummaryResponseDTO } from "../../types/api/city";

export function useGetCities() {
  const { data, error, isLoading, mutate } = useSWR<CitySummaryResponseDTO[]>(
    ["cities"],
    () => fetchCities()
  );

  return {
    cities: data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}
