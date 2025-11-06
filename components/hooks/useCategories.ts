import useSWR from "swr";
import { CategorySummaryResponseDTO } from "../../types/api/category";

async function fetcher(): Promise<CategorySummaryResponseDTO[]> {
  const res = await fetch("/api/categories", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR<
    CategorySummaryResponseDTO[]
  >("categories", fetcher, {
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
