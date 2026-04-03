import {
  CategoryDetailResponseDTO,
  CategorySummaryResponseDTO,
} from "types/api/category";
import { fetchWithHmac } from "lib/api/fetch-wrapper";
import { parseCategories, parseCategoryDetail } from "lib/validation/category";

// IMPORTANT: Do NOT add `next: { revalidate }` to external fetches.
// This causes OpenNext/SST to create a separate S3+DynamoDB cache entry for every unique URL.
// Use `cache: "no-store"` (fetchWithHmac default) to avoid unbounded cache growth.
// Internal API routes handle caching via Cache-Control headers instead.

export async function fetchCategoriesExternal(): Promise<CategorySummaryResponseDTO[]> {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api) return [];
  try {
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
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
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
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

