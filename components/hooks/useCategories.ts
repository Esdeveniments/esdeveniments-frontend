import useSWR from "swr";
import { fetchCategories } from "../../lib/api/categories";
import { CategorySummaryResponseDTO } from "../../types/api/category";

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR<
    CategorySummaryResponseDTO[]
  >("categories", fetchCategories, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 300000, // 5 minutes
  });

  return {
    categories: data || [],
    isLoading,
    isError: !!error,
    error,
    getCategoryById: (id: number) =>
      data?.find((category) => category.id === id) || null,
    getCategoryBySlug: (slug: string) =>
      data?.find((category) => category.slug === slug) || null,
    refetch: mutate,
  };
}
