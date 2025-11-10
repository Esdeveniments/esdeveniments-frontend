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
import { findCategoryBySlug, getAllCategorySlugs } from "./category-mapping";
import { highPrioritySlugs } from "./priority-places";

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

// Legacy categories for backward compatibility
const LEGACY_CATEGORIES: Record<string, URLCategory> = {
  tots: "tots",
  concerts: "concerts",
  festivals: "festivals",
  espectacles: "espectacles",
  familia: "familia",
  "fires-i-festes": "fires-i-festes",
  exposicions: "exposicions",
  esports: "esports",
  gastronomia: "gastronomia",
  "cursos-i-conferencies": "cursos-i-conferencies",
} as const;

/**
 * Check if a category slug is valid (either legacy or dynamic)
 */
export function isValidCategorySlug(
  categorySlug: string,
  dynamicCategories?: CategorySummaryResponseDTO[]
): boolean {
  // Check legacy categories first
  if (LEGACY_CATEGORIES[categorySlug]) {
    return true;
  }

  // Check dynamic categories if available
  if (dynamicCategories && Array.isArray(dynamicCategories)) {
    const found = dynamicCategories.some((cat) => cat.slug === categorySlug);
    if (found) return true;
  }

  // Default valid categories for fallback
  return categorySlug === "tots";
}

/**
 * Parse URL segments and query params into filter state
 * Enhanced with dynamic category support and smart 2-segment detection
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

  // Check query params for category and date if not in segments
  const queryCategory = searchParams.get("category");
  const queryDate = searchParams.get("date");

  if (segmentCount === 1) {
    // /catalunya or /catalunya?category=teatre&date=tots
    place = segments.place || "catalunya";
    // Use query params if present, otherwise defaults
    date = queryDate || "tots";
    category = queryCategory || "tots";
  } else if (segmentCount === 2) {
    // /catalunya/something - determine if 'something' is date or category
    place = segments.place || "catalunya";
    const secondSegment = segments.date || segments.category || "";

    if (isValidDateSlug(secondSegment)) {
      // It's a date: /catalunya/avui
      date = secondSegment;
      // Use query category if present, otherwise default
      category = queryCategory || "tots";
    } else {
      // It's a category: /catalunya/festivals
      date = queryDate || "tots";
      category = secondSegment;
    }
  } else {
    // 3 segments: /catalunya/avui/festivals (explicit structure)
    place = segments.place || "catalunya";
    date = segments.date || queryDate || "tots";
    category = segments.category || queryCategory || "tots";
  }

  // Validate and normalize segments
  const normalizedDate = isValidDateSlug(date) ? date : "tots";
  const normalizedCategory = isValidCategorySlug(category, dynamicCategories)
    ? category
    : "tots";

  // Determine if this is a canonical URL structure
  // Non-canonical if category/date are in query params but not in segments
  const hasQueryCategoryOrDate = queryCategory || queryDate;
  const isCanonical =
    (segmentCount <= 2 && !hasQueryCategoryOrDate) ||
    (!!(segments.place && segments.date && segments.category) &&
      isValidDateSlug(date) &&
      isValidCategorySlug(category, dynamicCategories) &&
      !hasQueryCategoryOrDate);

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
 * Get category slug from category value - enhanced with dynamic support
 * Falls back to legacy mapping if dynamic categories not available
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

  // Fall back to legacy mapping or return as-is if already a valid slug
  return LEGACY_CATEGORIES[category] || category || "tots";
}

/**
 * Generate static params for ISR - enhanced with dynamic categories and places
 */
export function getTopStaticCombinations(
  dynamicCategories?: CategorySummaryResponseDTO[],
  dynamicPlaces?: { slug: string }[]
) {
  const hardcodedTopPlaces = highPrioritySlugs;
  const topDates = VALID_DATES.filter((date) => date !== "tots"); // Exclude "tots" from static generation

  // Filter top places to only include those that exist in API data
  let topPlaces;
  if (dynamicPlaces && dynamicPlaces.length > 0) {
    const placeSlugs = new Set(dynamicPlaces.map((p) => p.slug));
    topPlaces = hardcodedTopPlaces.filter((slug) => placeSlugs.has(slug));
  } else {
    topPlaces = hardcodedTopPlaces;
  }

  // Get top categories from dynamic data or fall back to legacy
  let topCategories = ["tots"];

  if (dynamicCategories && Array.isArray(dynamicCategories)) {
    // Use first 5 dynamic categories + "tots"
    const dynamicSlugs = dynamicCategories.slice(0, 4).map((cat) => cat.slug);
    topCategories = ["tots", ...dynamicSlugs];
  } else {
    // Fall back to legacy categories
    topCategories = ["tots", "concerts", "festivals", "espectacles", "familia"];
  }

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
 * Combines legacy and dynamic categories
 */
export function getAllCategorySlugsForISR(
  dynamicCategories?: CategorySummaryResponseDTO[]
): string[] {
  if (dynamicCategories && Array.isArray(dynamicCategories)) {
    return getAllCategorySlugs(dynamicCategories);
  }

  // Fall back to legacy categories
  return Object.keys(LEGACY_CATEGORIES);
}

/**
 * Find category by slug in dynamic or legacy data
 * Returns category info for routing and display
 */
export function findCategoryForRouting(
  slug: string,
  dynamicCategories?: CategorySummaryResponseDTO[]
): { id?: number; name: string; slug: string } | null {
  // Try dynamic categories first
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

  // Fall back to legacy categories
  if (LEGACY_CATEGORIES[slug]) {
    return {
      name: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " "),
      slug: slug,
    };
  }

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
  const date = filters.byDate || "tots";
  let categorySlug = filters.category || "tots";

  // Ensure we use the correct slug for the category
  if (filters.category && filters.category !== "tots") {
    categorySlug = getCategorySlug(filters.category, dynamicCategories);
  }

  // Build URL based on filter values, omitting /tots/ when it's default
  let url: string;

  if (date === "tots" && categorySlug === "tots") {
    // Both default: /catalunya
    url = `/${place}`;
  } else if (date === "tots") {
    // Date is default, category is specific: /catalunya/festivals
    url = `/${place}/${categorySlug}`;
  } else if (categorySlug === "tots") {
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
