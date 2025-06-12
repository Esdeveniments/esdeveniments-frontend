import {
  CategoryDetailResponseDTO,
  CategorySummaryResponseDTO,
} from "types/api/category";
import { createCache, createKeyedCache } from "lib/api/cache";

const cache = createCache<CategorySummaryResponseDTO[]>(300000);
const categoryByIdCache = createKeyedCache<CategoryDetailResponseDTO | null>(
  300000
);

async function fetchCategoriesFromApi(): Promise<CategorySummaryResponseDTO[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export async function fetchCategories(): Promise<CategorySummaryResponseDTO[]> {
  // Use the cache to fetch categories
  return cache(fetchCategoriesFromApi);
}

async function fetchCategoryByIdApi(
  id: string | number
): Promise<CategoryDetailResponseDTO | null> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/categories/${id}`
  );
  if (!response.ok) return null;
  return response.json();
}

export async function fetchCategoryById(
  id: string | number
): Promise<CategoryDetailResponseDTO | null> {
  return categoryByIdCache(id, fetchCategoryByIdApi);
}
