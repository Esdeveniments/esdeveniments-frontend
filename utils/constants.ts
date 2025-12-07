import { PHASE_PRODUCTION_BUILD } from "next/constants";
import type { Option } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";

export const MAX_RESULTS = 15;
export const MAX_TOTAL_UPLOAD_BYTES = 9.5 * 1024 * 1024; // Keep ~0.5 MB headroom under 10 MB server limit

/**
 * Detects if the application is in build phase (SSG/static generation).
 * During build phase, we bypass internal API proxy and call external API directly
 * to avoid issues when the Next.js server isn't running.
 *
 * This is used to determine whether to use internal API routes (runtime) or
 * external API calls (build time) for data fetching.
 */
export const isBuildPhase =
  process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD ||
  (process.env.NODE_ENV === "production" && !process.env.VERCEL_URL);

export const DAYS: string[] = [
  "Diumenge",
  "Dilluns",
  "Dimarts",
  "Dimecres",
  "Dijous",
  "Divendres",
  "Dissabte",
];

export const MONTHS: string[] = [
  "gener",
  "febrer",
  "març",
  "abril",
  "maig",
  "juny",
  "juliol",
  "agost",
  "setembre",
  "octubre",
  "novembre",
  "desembre",
];

export const MONTHS_URL: string[] = [
  "gener",
  "febrer",
  "marc",
  "abril",
  "maig",
  "juny",
  "juliol",
  "agost",
  "setembre",
  "octubre",
  "novembre",
  "desembre",
];

// Legacy category constants removed - API is now the source of truth

export const BYDATES: Option[] = [
  { value: "avui", label: "Avui" },
  { value: "dema", label: "Demà" },
  { value: "cap-de-setmana", label: "Cap de setmana" },
  { value: "setmana", label: "Aquesta setmana" },
];

export const dateFunctions: { [key: string]: string } = {
  avui: "today",
  dema: "tomorrow",
  setmana: "week",
  "cap-de-setmana": "weekend",
};

export const DISTANCES: number[] = [5, 10, 25, 50, 100];

/**
 * Default filter value representing "all" (no filter applied)
 * Used for both category and date filters throughout the application
 */
export const DEFAULT_FILTER_VALUE = "tots";

/**
 * Dynamic category support functions
 * These functions use dynamic categories when available, fallback to static
 */

/**
 * Get category names mapping from dynamic categories (API is source of truth)
 * @param categories - Dynamic categories from API
 * @returns Record mapping category slugs to display names
 */
export function getDynamicCategoryNamesMap(
  categories?: CategorySummaryResponseDTO[]
): Record<string, string> {
  if (categories && categories.length > 0) {
    // Create mapping from dynamic categories: slug -> name
    return categories.reduce((acc, category) => {
      acc[category.slug] = category.name;
      return acc;
    }, {} as Record<string, string>);
  }

  // Return empty object if no categories available
  return {};
}

/**
 * Get search terms subset from dynamic categories (API is source of truth)
 * @param categories - Dynamic categories from API
 * @returns Array of category names for search
 */
export function getDynamicSearchTermsSubset(
  categories?: CategorySummaryResponseDTO[]
): string[] {
  if (categories && categories.length > 0) {
    // Return first 4 category names for search subset
    return categories.slice(0, 4).map((cat) => cat.name);
  }

  // Return empty array if no categories available
  return [];
}

/**
 * Check if we should use dynamic categories
 * This can be enhanced with feature flags in the future
 */
export function shouldUseDynamicCategories(): boolean {
  // For now, always try to use dynamic categories when available
  // Can be enhanced with environment variables or feature flags
  return true;
}

/**
 * Get category display name from dynamic categories (API is source of truth)
 * @param categorySlug - Category slug
 * @param categories - Dynamic categories from API
 * @returns Display name for the category, or slug if not found
 */
export function getCategoryDisplayName(
  categorySlug: string,
  categories?: CategorySummaryResponseDTO[]
): string {
  if (categories && categories.length > 0) {
    const dynamicCategory = categories.find((cat) => cat.slug === categorySlug);
    if (dynamicCategory) {
      return dynamicCategory.name;
    }
  }

  // Return slug as fallback (capitalize first letter for readability)
  return (
    categorySlug.charAt(0).toUpperCase() +
    categorySlug.slice(1).replace(/-/g, " ")
  );
}

// --- News UI constants ---
export const NEWS_HUBS: { slug: string; name: string }[] = [
  { slug: "mataro", name: "Mataró" },
  { slug: "barcelona", name: "Barcelona" },
  // { slug: "girona", name: "Girona" }, // Not yet in database
  { slug: "tarragona", name: "Tarragona" },
  { slug: "lleida", name: "Lleida" },
];

export const NEARBY_PLACES_BY_HUB: Record<
  string,
  { slug: string; name: string }[]
> = {
  mataro: [
    { slug: "vilassar-de-mar", name: "Vilassar de Mar" },
    { slug: "premia-de-dalt", name: "Premià de Dalt" },
    { slug: "argentona", name: "Argentona" },
    { slug: "calella", name: "Calella" },
    { slug: "canet-de-mar", name: "Canet de Mar" },
  ],
  barcelona: [
    { slug: "l-hospitalet-de-llobregat", name: "L'Hospitalet de Llobregat" },
    { slug: "badalona", name: "Badalona" },
    { slug: "sant-just-desvern", name: "Sant Just Desvern" },
    { slug: "cardedeu", name: "Cardedeu" },
    { slug: "granollers", name: "Granollers" },
    { slug: "castelldefels", name: "Castelldefels" },
  ],
  // girona: [ // Not yet in database
  //   { slug: "figueres", name: "Figueres" },
  //   { slug: "blanes", name: "Blanes" },
  //   { slug: "olot", name: "Olot" },
  // ],
  tarragona: [
    { slug: "reus", name: "Reus" },
    { slug: "cambrils", name: "Cambrils" },
    { slug: "salou", name: "Salou" },
  ],
  lleida: [
    { slug: "balaguer", name: "Balaguer" },
    { slug: "tremp", name: "Tremp" },
    { slug: "tarrega", name: "Tàrrega" },
  ],
};

// Time tolerance constants for HMAC timestamp validation
// Configurable timestamp tolerances via environment variablesexport
export const FIVE_MINUTES_IN_MS = parseInt(
  process.env.HMAC_PAST_TOLERANCE_MS || "300000",
  10
); // 5 minutes tolerance for past timestamps
export const ONE_MINUTE_IN_MS = parseInt(
  process.env.HMAC_FUTURE_TOLERANCE_MS || "60000",
  10
); // 1 minute tolerance for future timestamps to account for clock skew

/**
 * DOS protection: limits on query parameters
 * These constants are used consistently across middleware and URL utilities
 * to prevent denial-of-service attacks via malicious query parameters.
 *
 * Since middleware runs first and validates/rejects requests, these limits
 * should be enforced at the edge. Internal utilities can use the same limits
 * for defensive validation and truncation.
 */
export const MAX_QUERY_STRING_LENGTH = 2048; // Total query string length
export const MAX_QUERY_PARAMS = 50; // Maximum number of query parameters
export const MAX_PARAM_VALUE_LENGTH = 500; // Maximum length of individual parameter value
export const MAX_PARAM_KEY_LENGTH = 100; // Maximum length of individual parameter key
export const MAX_TOTAL_VALUE_LENGTH = 10000; // Maximum total length of all parameter values combined (for truncation scenarios)
