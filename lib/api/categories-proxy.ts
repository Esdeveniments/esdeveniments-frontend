import type { CategorySummaryResponseDTO } from "types/api/category";
import { createProxyListLoader, PROXY_TIMEOUT_MS } from "@lib/api/proxy-list";
import {
  CATEGORIES_LIST_CACHE_KEY,
  fetchCategoriesExternal,
} from "./categories-external";

const categoriesLoader = createProxyListLoader(
  () => fetchCategoriesExternal(),
  { globalKey: CATEGORIES_LIST_CACHE_KEY },
);

/**
 * The backend categories for Proxy checks, or null when the backend can't
 * answer (error, timeout, empty list) so callers fail open.
 */
export async function getCategoriesForProxy(): Promise<
  CategorySummaryResponseDTO[] | null
> {
  if (categoriesLoader.isBackingOff()) return null;
  try {
    const categories = await categoriesLoader.load(
      AbortSignal.timeout(PROXY_TIMEOUT_MS),
    );
    if (categories.length > 0) return categories;
  } catch {
    // Timeout. fetchCategoriesExternal itself returns [] on errors.
  }
  categoriesLoader.backOff();
  return null;
}
