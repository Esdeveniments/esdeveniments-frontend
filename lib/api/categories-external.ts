import {
  CategoryDetailResponseDTO,
  CategorySummaryResponseDTO,
} from "types/api/category";
import { fetchWithHmac } from "lib/api/fetch-wrapper";
import { parseCategories } from "lib/validation/category";

export async function fetchCategoriesExternal(): Promise<CategorySummaryResponseDTO[]> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];
  const res = await fetchWithHmac(`${api}/categories`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return parseCategories(json);
}

export async function fetchCategoryByIdExternal(
  id: string | number
): Promise<CategoryDetailResponseDTO | null> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return null;
  const res = await fetchWithHmac(`${api}/categories/${id}`);
  if (!res.ok) return null;
  return res.json();
}

