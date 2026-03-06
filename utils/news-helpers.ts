import type { NewsSummaryResponseDTO } from "types/api/news";

const DEFAULT_NEWS_PAGINATION = Object.freeze({ page: 0, size: 10 });

/**
 * Parse a single string-or-array query parameter into a string | undefined.
 */
function parseStringParam(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

/**
 * Extract page/size from news query params with safe defaults.
 * Shared between /noticies and /noticies/[place] pages.
 */
export function parseNewsPagination(
  query: Record<string, string | string[] | undefined>,
  defaults = DEFAULT_NEWS_PAGINATION,
): { currentPage: number; pageSize: number } {
  const parsedPage = Math.floor(Number(parseStringParam(query.page)));
  const currentPage =
    Number.isFinite(parsedPage) && parsedPage >= 0 ? parsedPage : defaults.page;

  const parsedSize = Math.floor(Number(parseStringParam(query.size)));
  const pageSize =
    Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : defaults.size;

  return { currentPage, pageSize };
}

/**
 * Resolve the place slug/label for a news item based on its city/region,
 * falling back to the provided defaults.
 */
export function resolveNewsItemPlace(
  item: NewsSummaryResponseDTO,
  fallbackSlug: string,
  fallbackLabel: string,
): { slug: string; label: string } {
  return {
    slug: item.city?.slug || item.region?.slug || fallbackSlug,
    label: item.city?.name || item.region?.name || fallbackLabel,
  };
}
