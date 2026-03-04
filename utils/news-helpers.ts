import type { NewsSummaryResponseDTO } from "types/api/news";

/**
 * Parse a single string-or-array query parameter into a string | undefined.
 */
function parseStringParam(
  value: string | string[] | undefined
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
  defaults = { page: 0, size: 10 }
) {
  const parsedPage = Number(parseStringParam(query.page));
  const currentPage =
    Number.isFinite(parsedPage) && parsedPage >= 0
      ? parsedPage
      : defaults.page;

  const parsedSize = Number(parseStringParam(query.size));
  const pageSize =
    Number.isFinite(parsedSize) && parsedSize > 0
      ? parsedSize
      : defaults.size;

  return { currentPage, pageSize };
}

/**
 * Resolve the place slug/label for a news item based on its city/region,
 * falling back to the provided defaults.
 */
export function resolveNewsItemPlace(
  item: NewsSummaryResponseDTO,
  fallbackSlug: string,
  fallbackLabel: string
) {
  return {
    slug: item.city?.slug || item.region?.slug || fallbackSlug,
    label: item.city?.name || item.region?.name || fallbackLabel,
  };
}
