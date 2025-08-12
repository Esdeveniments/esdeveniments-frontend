import {
  CategoryDetailResponseDTO,
  CategorySummaryResponseDTO,
} from "types/api/category";
import { createCache, createKeyedCache } from "lib/api/cache";

const cache = createCache<CategorySummaryResponseDTO[]>(86400000);
const categoryByIdCache = createKeyedCache<CategoryDetailResponseDTO | null>(
  86400000
);

async function fetchCategoriesFromApi(): Promise<CategorySummaryResponseDTO[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories`, {
    next: { revalidate: 86400, tags: ["categories"] },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
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

async function fetchCategoryByIdApi(
  id: string | number
): Promise<CategoryDetailResponseDTO | null> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/categories/${id}`,
    { next: { revalidate: 86400, tags: ["categories", `category:${id}`] } }
  );
  if (!response.ok) return null;
  return response.json();
}

export async function fetchCategoryById(
  id: string | number
): Promise<CategoryDetailResponseDTO | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    return await categoryByIdCache(id, fetchCategoryByIdApi);
  } catch (e) {
    console.error("Error fetching category by id:", e);
    return null;
  }
}
