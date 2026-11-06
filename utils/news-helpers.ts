import type { NewsSummaryResponseDTO } from "types/api/news";

const PAGE_NUMBER_RE = /^[1-9]\d*$/;
const NEWS_PAGINATION_PARAMS = ["page", "size", "cities"] as const;

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
 * 1-based page from `?page=`. Anything else is page 1 (Proxy 301s those URLs,
 * see getCanonicalNewsSearch). Shared by /noticies and /noticies/[place].
 */
export function parseNewsPage(
  query: Record<string, string | string[] | undefined>,
): number {
  const raw = parseStringParam(query.page);
  return raw && PAGE_NUMBER_RE.test(raw) ? Number(raw) : 1;
}

/** List path of the all-news index or a place's news. */
export function getNewsBasePath(place?: string): string {
  return place ? `/noticies/${place}` : "/noticies";
}

/** Path of a news list page: page 1 has no query. */
export function buildNewsPageHref(basePath: string, page: number): string {
  return page > 1 ? `${basePath}?page=${page}` : basePath;
}

/**
 * Canonical query for a news list URL, or null when it already is canonical.
 * Old links were 0-based and always carried `size` (`?page=1&size=10` was the
 * second page); `?cities=all` was a show-more toggle. Both map to `?page=N`.
 */
export function getCanonicalNewsSearch(params: URLSearchParams): string | null {
  if (!NEWS_PAGINATION_PARAMS.some((key) => params.has(key))) return null;

  const rawPage = params.get("page") ?? "";
  const isLegacy = params.has("size") || params.has("cities");
  if (!isLegacy && PAGE_NUMBER_RE.test(rawPage) && rawPage !== "1") return null;

  const legacyPage = Number(rawPage);
  const page = isLegacy
    ? Number.isInteger(legacyPage) && legacyPage >= 0
      ? legacyPage + 1
      : 1
    : 1;

  const next = new URLSearchParams(params);
  NEWS_PAGINATION_PARAMS.forEach((key) => next.delete(key));
  if (page > 1) next.set("page", String(page));
  return next.toString();
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
