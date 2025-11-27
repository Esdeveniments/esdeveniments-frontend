import {
  CategoryDetailResponseDTO,
  CategorySummaryResponseDTO,
} from "types/api/category";
import { createCache, createKeyedCache } from "lib/api/cache";
import { getInternalApiUrl } from "@utils/api-helpers";
import { cache as reactCache } from "react";
import { parseCategories } from "lib/validation/category";

const cache = createCache<CategorySummaryResponseDTO[]>(86400000);
const categoryByIdCache = createKeyedCache<CategoryDetailResponseDTO | null>(
  86400000
);

async function fetchCategoriesFromApi(): Promise<CategorySummaryResponseDTO[]> {
  const response = await fetch(getInternalApiUrl(`/api/categories`), {
    next: { revalidate: 86400, tags: ["categories"] },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const json = await response.json();
  return parseCategories(json);
}

export async function fetchCategories(): Promise<CategorySummaryResponseDTO[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];
  try {
    return await cache(fetchCategoriesFromApi);
  } catch (e) {
    console.error("Error fetching categories:", e);
    return [];
  }
}

// React per-request memoization for metadata+page deduplication
export const getCategories = reactCache(fetchCategories);

async function fetchCategoryByIdApi(
  id: string | number
): Promise<CategoryDetailResponseDTO | null> {
  const response = await fetch(getInternalApiUrl(`/api/categories/${id}`), {
    next: { revalidate: 86400, tags: ["categories", `category:${id}`] },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function fetchCategoryById(
  id: string | number
): Promise<CategoryDetailResponseDTO | null> {
  try {
    return await categoryByIdCache(id, fetchCategoryByIdApi);
  } catch (e) {
    console.error("Error fetching category by id:", e);
    return null;
  }
}
