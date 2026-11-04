import type { CategorySummaryResponseDTO } from "types/api/category";
import { createProxyListLoader, PROXY_TIMEOUT_MS } from "@lib/api/proxy-list";
import { fetchCategoriesExternal } from "./categories-external";

const categoriesLoader = createProxyListLoader(fetchCategoriesExternal);

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
    // fetchCategoriesExternal returns [] on errors; this is a safety net.
  }
  categoriesLoader.backOff();
  return null;
}
