const NON_CANONICAL_LISTING_KEYS = [
  "search",
  "distance",
  "lat",
  "lon",
] as const;

function hasNonEmptyValue(value: string | string[] | undefined): boolean {
  if (value === undefined) return false;
  if (Array.isArray(value)) {
    return value.some((v) => v.trim().length > 0);
  }
  return value.trim().length > 0;
}

export function getRobotsForListingPage(
  searchParams: Record<string, string | string[] | undefined> | undefined
): "noindex, follow" | "index, follow" {
  if (!searchParams) return "index, follow";

  const hasNonCanonicalFilters = NON_CANONICAL_LISTING_KEYS.some((key) =>
    hasNonEmptyValue(searchParams[key])
  );

  return hasNonCanonicalFilters ? "noindex, follow" : "index, follow";
}
