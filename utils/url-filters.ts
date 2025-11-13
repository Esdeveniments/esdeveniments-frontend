/**
 * URL-first filter management utilities
 * Handles the canonical route structure: /place/date/category
 * With query params for client-side filters: search, distance
 *
 * Phase 2: Enhanced with dynamic category support
 */

import type { CategorySummaryResponseDTO } from "types/api/category";
import type {
  URLCategory,
  URLFilterState,
  RouteSegments,
  URLQueryParams,
  ParsedFilters,
} from "types/url-filters";
import { VALID_DATES, isValidDateSlug } from "@lib/dates";
import {
  findCategoryBySlug,
  getAllCategorySlugs,
  isValidCategorySlugFormat,
} from "./category-mapping";
import { topStaticGenerationPlaces } from "./priority-places";
import { DEFAULT_FILTER_VALUE } from "./constants";

/**
 * Convert Next.js searchParams object to URLSearchParams
 * Handles string, string[], and undefined values correctly
 * 
 * 🛡️ SECURITY: Limits parameter count and size to prevent DoS attacks
 */
export function toUrlSearchParams(
  raw: Record<string, string | string[] | undefined>
): URLSearchParams {
  const params = new URLSearchParams();
  const MAX_PARAMS = 50; // Maximum number of distinct parameters
  const MAX_VALUE_LENGTH = 1000; // Maximum length per parameter value
  const MAX_TOTAL_LENGTH = 10000; // Maximum total length of all values combined
  
  let paramCount = 0;
  let totalLength = 0;
  
  for (const [key, value] of Object.entries(raw)) {
    if (paramCount >= MAX_PARAMS) break;
    
    // Validate key length
    if (key.length > 100) continue;
    
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry != null && typeof entry === "string") {
          const truncated = entry.slice(0, MAX_VALUE_LENGTH);
          if (totalLength + truncated.length > MAX_TOTAL_LENGTH) break;
          params.append(key, truncated);
          totalLength += truncated.length;
        }
      }
    } else if (value != null && typeof value === "string") {
      const truncated = value.slice(0, MAX_VALUE_LENGTH);
      if (totalLength + truncated.length > MAX_TOTAL_LENGTH) break;
      params.append(key, truncated);
      totalLength += truncated.length;
    }
    
    paramCount++;
  }
  
  return params;
}

/**
 * Validate latitude coordinate
 */
function isValidLatitude(lat: number): boolean {
  return !isNaN(lat) && lat >= -90 && lat <= 90;
}

/**
 * Validate longitude coordinate
 */
function isValidLongitude(lon: number): boolean {
  return !isNaN(lon) && lon >= -180 && lon <= 180;
}

/**
 * Safely parse and validate latitude coordinate
 */
function parseLatitude(value: string): number | undefined {
  const lat = parseFloat(value);
  return isValidLatitude(lat) ? lat : undefined;
}

/**
 * Safely parse and validate longitude coordinate
 */
function parseLongitude(value: string): number | undefined {
  const lon = parseFloat(value);
  return isValidLongitude(lon) ? lon : undefined;
}

/**
 * Check if a category slug is valid (dynamic categories or format validation)
 * Relies on API categories as the source of truth
 */
export function isValidCategorySlug(
  categorySlug: string,
  dynamicCategories?: CategorySummaryResponseDTO[]
): boolean {
  // Always allow "tots" (default filter value)
  if (categorySlug === DEFAULT_FILTER_VALUE) {
    return true;
  }

  // Check dynamic categories if available (primary source of truth)
  if (dynamicCategories && Array.isArray(dynamicCategories) && dynamicCategories.length > 0) {
    const found = dynamicCategories.some((cat) => cat.slug === categorySlug);
    return found;
  }

  // If no dynamic categories available, validate format only
  // This allows URLs to work during build/fallback scenarios
  // The category will be validated against API at runtime
  return isValidCategorySlugFormat(categorySlug);
}

/**
 * Parse URL segments and query params into filter state
 *
 * NOTE: Query params for category/date are supported for backward compatibility only.
 * They are immediately redirected to canonical URLs (e.g., /barcelona?category=teatre -> /barcelona/teatre).
 * Only search, distance, lat, and lon are valid query params in canonical URLs.
 */
export function parseFiltersFromUrl(
  segments: { place?: string; date?: string; category?: string },
  searchParams: URLSearchParams,
  dynamicCategories?: CategorySummaryResponseDTO[]
): ParsedFilters {
  // Count non-empty segments
  const segmentValues = [
    segments.place,
    segments.date,
    segments.category,
  ].filter(Boolean);
  const segmentCount = segmentValues.length;

  let place: string;
  let date: string;
  let category: string;

  // Legacy support: Check query params for category and date
  // NOTE: Production doesn't currently use query params, but we support them for:
  // 1. Any legacy indexed URLs that might exist
  // 2. Defensive redirects to canonical URL structure
  const queryCategory = searchParams.get("category");
  const queryDate = searchParams.get("date");

  if (segmentCount === 1) {
    // /catalunya or /catalunya?category=teatre&date=tots (legacy - redirects)
    place = segments.place || "catalunya";
    date = queryDate || DEFAULT_FILTER_VALUE;
    category = queryCategory || DEFAULT_FILTER_VALUE;
  } else if (segmentCount === 2) {
    // /catalunya/something - determine if 'something' is date or category
    place = segments.place || "catalunya";
    const secondSegment = segments.date || segments.category || "";

    if (isValidDateSlug(secondSegment)) {
      // It's a date: /catalunya/avui
      date = secondSegment;
      category = queryCategory || DEFAULT_FILTER_VALUE; // Legacy: query category if present
    } else {
      // It's a category: /catalunya/festivals
      date = queryDate || DEFAULT_FILTER_VALUE; // Legacy: query date if present
      category = secondSegment;
    }
  } else {
    // 3 segments: /catalunya/avui/festivals (canonical structure)
    place = segments.place || "catalunya";
    date = segments.date || queryDate || DEFAULT_FILTER_VALUE;
    category = segments.category || queryCategory || DEFAULT_FILTER_VALUE;
  }

  // Validate and normalize segments
  const normalizedDate = isValidDateSlug(date) ? date : DEFAULT_FILTER_VALUE;
  const normalizedCategory = isValidCategorySlug(category, dynamicCategories)
    ? category
    : DEFAULT_FILTER_VALUE;

  // Determine if this is a canonical URL structure
  //
  // Production currently only uses: /place and /place/byDate (2-segment routes)
  // The 3-segment route (/place/byDate/category) exists in code but isn't deployed yet
  //
  // Non-canonical patterns that need redirect (to avoid breaking indexed URLs):
  // 1. "tots" appears in URL segments (should be omitted per omission rules)
  //    - /barcelona/tots → /barcelona
  // 2. category/date in query params (defensive - for any legacy indexed URLs)
  //    - /barcelona?category=teatre → /barcelona/teatre
  //    - /barcelona?date=avui → /barcelona/avui
  const hasQueryCategoryOrDate = queryCategory || queryDate;
  const hasTotsInSegments =
    segments.date === DEFAULT_FILTER_VALUE || segments.category === DEFAULT_FILTER_VALUE;

  // Canonical URLs should:
  // - Not have "tots" in segments (it should be omitted)
  // - Not have category/date in query params (they should be in segments)
  // - Follow the omission rules:
  //   * date=tots AND category=tots → /place (1 segment)
  //   * date=tots AND category=specific → /place/category (2 segments)
  //   * date=specific AND category=tots → /place/date (2 segments)
  //   * date=specific AND category=specific → /place/date/category (3 segments)
  const isCanonical =
    !hasQueryCategoryOrDate &&
    !hasTotsInSegments &&
    ((segmentCount === 1 &&
      normalizedDate === DEFAULT_FILTER_VALUE &&
      normalizedCategory === DEFAULT_FILTER_VALUE) ||
      (segmentCount === 2 &&
        ((normalizedDate === DEFAULT_FILTER_VALUE && normalizedCategory !== DEFAULT_FILTER_VALUE) ||
          (normalizedDate !== DEFAULT_FILTER_VALUE && normalizedCategory === DEFAULT_FILTER_VALUE))) ||
      (segmentCount === 3 &&
        normalizedDate !== DEFAULT_FILTER_VALUE &&
        normalizedCategory !== DEFAULT_FILTER_VALUE &&
        isValidDateSlug(normalizedDate) &&
        isValidCategorySlug(normalizedCategory, dynamicCategories)));

  return {
    segments: {
      place,
      date: normalizedDate,
      category: normalizedCategory,
    },
    queryParams: {
      search: searchParams.get("search") || undefined,
      distance: searchParams.get("distance") || undefined,
      lat: searchParams.get("lat") || undefined,
      lon: searchParams.get("lon") || undefined,
    },
    isCanonical,
  };
}

/**
 * Build canonical URL from filter state
 * Updated to support dynamic categories
 */
export function buildCanonicalUrl(
  filters: Partial<URLFilterState>,
  dynamicCategories?: CategorySummaryResponseDTO[]
): string {
  return buildCanonicalUrlDynamic(filters, dynamicCategories);
}

/**
 * Build URL for filter changes (used by FiltersModal)
 * Enhanced with dynamic category support
 */
export function buildFilterUrl(
  currentSegments: RouteSegments,
  currentQuery: URLQueryParams,
  changes: Partial<URLFilterState>,
  dynamicCategories?: CategorySummaryResponseDTO[]
): string {
  const newFilters: Partial<URLFilterState> = {
    place: changes.place || currentSegments.place,
    byDate: changes.byDate || currentSegments.date,
    category: changes.category || (currentSegments.category as URLCategory),
    searchTerm:
      changes.searchTerm !== undefined
        ? changes.searchTerm
        : currentQuery.search,
    distance:
      "distance" in changes
        ? changes.distance
        : parseInt(currentQuery.distance || "50"),
    lat:
      "lat" in changes
        ? changes.lat
        : currentQuery.lat
        ? parseLatitude(currentQuery.lat)
        : undefined,
    lon:
      "lon" in changes
        ? changes.lon
        : currentQuery.lon
        ? parseLongitude(currentQuery.lon)
        : undefined,
  };

  const result = buildCanonicalUrl(newFilters, dynamicCategories);
  return result;
}

/**
 * Build a canonical fallback URL to Catalunya when the requested place is invalid.
 * - Preserves intent (date/category) when provided, normalizing invalid dates to "tots"
 * - Preserves only allowed query params (search, distance, lat, lon)
 * - Uses existing canonical URL builder to avoid hand-crafted strings
 */
export function buildFallbackUrlForInvalidPlace(opts: {
  byDate?: string;
  category?: string;
  rawSearchParams: Record<string, string | string[] | undefined>;
}): string {
  const params = toUrlSearchParams(opts.rawSearchParams);
  const queryCategory = params.get("category");
  
  // Helper to check if a string looks like it could be a real category (not obviously invalid)
  const looksLikeCategory = (slug: string): boolean => {
    // Exclude obvious non-categories: date formats, reserved words, error-like strings
    if (/^\d{4}-\d{2}-\d{2}$/.test(slug)) return false; // Date format: 2024-01-15
    if (slug === "null" || slug === "undefined" || slug === "invalid") return false;
    if (slug.startsWith("invalid-") || slug.includes("error")) return false;
    return true;
  };
  
  // Derive category from byDate if it's not a valid date but is a valid category slug format
  // This handles the case where /foo/festivals is parsed as [place]/[byDate] but
  // "festivals" is actually a category, not a date
  // Note: We check format only to support dynamic categories from API
  // But we exclude obviously invalid strings to avoid false positives
  const derivedCategoryFromByDate =
    opts.byDate &&
    !isValidDateSlug(opts.byDate) &&
    isValidCategorySlugFormat(opts.byDate) &&
    looksLikeCategory(opts.byDate)
      ? opts.byDate
      : undefined;

  // Priority: explicit category > query category > derived from byDate
  const derivedCategory = 
    opts.category ?? 
    (queryCategory && isValidCategorySlugFormat(queryCategory) ? queryCategory : undefined) ??
    derivedCategoryFromByDate;

  // 🛡️ SECURITY: Validate distance to prevent NaN in URLs
  const distanceParam = params.get("distance");
  let distance: number | undefined;
  if (distanceParam) {
    const parsed = parseInt(distanceParam, 10);
    // Only use if parsing succeeded and result is a valid number
    if (!isNaN(parsed) && isFinite(parsed) && parsed > 0) {
      distance = parsed;
    }
  }

  const filters: Partial<URLFilterState> = {
    place: "catalunya",
    byDate:
      opts.byDate && isValidDateSlug(opts.byDate) ? opts.byDate : DEFAULT_FILTER_VALUE,
    category: derivedCategory || DEFAULT_FILTER_VALUE,
    searchTerm: params.get("search") || undefined,
    distance,
    lat: params.get("lat") ? parseLatitude(params.get("lat") as string) : undefined,
    lon: params.get("lon") ? parseLongitude(params.get("lon") as string) : undefined,
  };

  return buildCanonicalUrl(filters);
}

/**
 * Convert URL segments to FilterState for compatibility with existing components
 */
export function urlToFilterState(parsed: ParsedFilters): URLFilterState {
  return {
    place: parsed.segments.place,
    byDate: parsed.segments.date,
    category: parsed.segments.category as URLCategory,
    searchTerm: parsed.queryParams.search || "",
    distance: parseInt(parsed.queryParams.distance || "50"),
    lat: parsed.queryParams.lat
      ? parseLatitude(parsed.queryParams.lat)
      : undefined,
    lon: parsed.queryParams.lon
      ? parseLongitude(parsed.queryParams.lon)
      : undefined,
  };
}

/**
 * Check if a redirect is needed for non-canonical URLs
 */
export function getRedirectUrl(parsed: ParsedFilters): string | null {
  if (parsed.isCanonical) {
    return null;
  }

  // Always redirect to canonical structure
  const redirectUrl = buildCanonicalUrl(urlToFilterState(parsed));
  return redirectUrl;
}

/**
 * Get category slug from category value - uses dynamic categories as source of truth
 */
export function getCategorySlug(
  category: URLCategory,
  dynamicCategories?: CategorySummaryResponseDTO[]
): string {
  // If we have dynamic categories, try to find the category
  if (dynamicCategories && Array.isArray(dynamicCategories)) {
    const foundCategory = dynamicCategories.find(
      (cat) =>
        cat.name.toLowerCase() === category.toLowerCase() ||
        cat.slug === category
    );
    if (foundCategory) {
      return foundCategory.slug;
    }
  }

  // Return as-is if already a valid slug format, or default
  // No legacy mapping - API is the source of truth
  return category || DEFAULT_FILTER_VALUE;
}

/**
 * Generate static params for ISR - enhanced with dynamic categories and places
 */
export function getTopStaticCombinations(
  dynamicCategories?: CategorySummaryResponseDTO[],
  dynamicPlaces?: { slug: string }[]
) {
  // Use smaller list for static generation to keep build size under 230MB
  // Each place generates ~4.6MB, so ~15 places = ~69MB (within limit)
  const hardcodedTopPlaces = topStaticGenerationPlaces;
  const topDates = VALID_DATES.filter((date) => date !== DEFAULT_FILTER_VALUE); // Exclude "tots" from static generation

  // Filter top places to only include those that exist in API data
  let topPlaces;
  if (dynamicPlaces && dynamicPlaces.length > 0) {
    const placeSlugs = new Set(dynamicPlaces.map((p) => p.slug));
    topPlaces = hardcodedTopPlaces.filter((slug) => placeSlugs.has(slug));
  } else {
    topPlaces = hardcodedTopPlaces;
  }

  // Get top categories from dynamic data (API is source of truth)
  let topCategories = [DEFAULT_FILTER_VALUE];

  if (dynamicCategories && Array.isArray(dynamicCategories)) {
    // Use first 5 dynamic categories + "tots"
    const dynamicSlugs = dynamicCategories.slice(0, 4).map((cat) => cat.slug);
    topCategories = [DEFAULT_FILTER_VALUE, ...dynamicSlugs];
  }
  // If no dynamic categories, only use "tots" (empty array would skip category generation)

  const combinations = [];

  for (const place of topPlaces) {
    for (const date of topDates) {
      for (const category of topCategories) {
        combinations.push({ place, date, category });
      }
    }
  }

  return combinations;
}

/**
 * Get all possible category slugs for ISR generation
 * Uses dynamic categories from API as source of truth
 */
export function getAllCategorySlugsForISR(
  dynamicCategories?: CategorySummaryResponseDTO[]
): string[] {
  if (dynamicCategories && Array.isArray(dynamicCategories)) {
    return getAllCategorySlugs(dynamicCategories);
  }

  // If no dynamic categories available, return empty array
  // ISR generation should fetch categories before calling this
  return [];
}

/**
 * Find category by slug in dynamic categories
 * Returns category info for routing and display
 * Note: This function is currently unused but kept for potential future use
 */
export function findCategoryForRouting(
  slug: string,
  dynamicCategories?: CategorySummaryResponseDTO[]
): { id?: number; name: string; slug: string } | null {
  // Use dynamic categories as source of truth
  if (dynamicCategories && Array.isArray(dynamicCategories)) {
    const category = findCategoryBySlug(dynamicCategories, slug);
    if (category) {
      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
      };
    }
  }

  // No legacy fallback - API is the source of truth
  return null;
}

/**
 * Build canonical URL with dynamic category support
 * Omits /tots/ date segment when it's the default
 */
export function buildCanonicalUrlDynamic(
  filters: Partial<URLFilterState>,
  dynamicCategories?: CategorySummaryResponseDTO[]
): string {
  const place = filters.place || "catalunya";
  const date = filters.byDate || DEFAULT_FILTER_VALUE;
  let categorySlug = filters.category || DEFAULT_FILTER_VALUE;

  // Ensure we use the correct slug for the category
  if (filters.category && filters.category !== DEFAULT_FILTER_VALUE) {
    categorySlug = getCategorySlug(filters.category, dynamicCategories);
  }

  // Build URL based on filter values, omitting /tots/ when it's default
  let url: string;

  if (date === DEFAULT_FILTER_VALUE && categorySlug === DEFAULT_FILTER_VALUE) {
    // Both default: /catalunya
    url = `/${place}`;
  } else if (date === DEFAULT_FILTER_VALUE) {
    // Date is default, category is specific: /catalunya/festivals
    url = `/${place}/${categorySlug}`;
  } else if (categorySlug === DEFAULT_FILTER_VALUE) {
    // Date is specific, category is default: /catalunya/avui
    url = `/${place}/${date}`;
  } else {
    // Both specific: /catalunya/avui/festivals
    url = `/${place}/${date}/${categorySlug}`;
  }

  // Add query params for client-side filters
  const params = new URLSearchParams();
  if (filters.searchTerm) {
    params.set("search", filters.searchTerm);
  }
  if (filters.distance !== undefined && filters.distance !== 50) {
    // Only add distance if it's defined and not the default value
    params.set("distance", filters.distance.toString());
  }

  if (filters.lat !== undefined) {
    params.set("lat", filters.lat.toString());
  }
  if (filters.lon !== undefined) {
    params.set("lon", filters.lon.toString());
  }

  const queryString = params.toString();

  if (queryString) {
    url += `?${queryString}`;
  }

  return url;
}
