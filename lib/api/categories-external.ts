import {
  CategoryDetailResponseDTO,
  CategorySummaryResponseDTO,
} from "types/api/category";
import { fetchWithHmac } from "lib/api/fetch-wrapper";
import { parseCategories, parseCategoryDetail } from "lib/validation/category";

export async function fetchCategoriesExternal(): Promise<CategorySummaryResponseDTO[]> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];
  try {
    const res = await fetchWithHmac(`${api}/categories`);
    if (!res.ok) {
      console.error(`Failed to fetch categories: HTTP ${res.status}`);
      return [];
    }
    const json = await res.json();
    return parseCategories(json);
  } catch (error) {
    console.error("fetchCategoriesExternal: failed", error);
    return [];
  }
}

export async function fetchCategoryByIdExternal(
  id: string | number
): Promise<CategoryDetailResponseDTO | null> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return null;
  try {
    const res = await fetchWithHmac(`${api}/categories/${id}`);
    if (!res.ok) {
      console.error("fetchCategoryByIdExternal:", id, "HTTP", res.status);
      return null;
    }
    const json = await res.json();
    return parseCategoryDetail(json);
  } catch (error) {
    console.error("fetchCategoryByIdExternal:", id, "failed", error);
    return null;
  }
}

