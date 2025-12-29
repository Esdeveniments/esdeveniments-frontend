import { PHASE_PRODUCTION_BUILD } from "next/constants";
import type { ByDateOption } from "types/common";
import { getTranslations } from "next-intl/server";
import type { CategorySummaryResponseDTO } from "types/api/category";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";
import caMessages from "../messages/ca.json";
import esMessages from "../messages/es.json";
import enMessages from "../messages/en.json";

export const MAX_RESULTS = 15;
export const MAX_FAVORITES = 10;
// Keep safely under Lambda's 6MB cap and common CDN/body limits
export const MAX_TOTAL_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB target
export const EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR =
  "event_image_upload_too_large";
export const MAX_ORIGINAL_FILE_BYTES = 25 * 1024 * 1024; // Guardrail to avoid massive browser uploads

export const formatMegabytesLabel = (bytes: number): string => {
  const value = bytes / (1024 * 1024);
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
};

export const formatMegabytes = (bytes: number): string =>
  (bytes / (1024 * 1024)).toFixed(2);

export const MAX_UPLOAD_LIMIT_LABEL = formatMegabytesLabel(
  MAX_TOTAL_UPLOAD_BYTES
);

export const MAX_ORIGINAL_LIMIT_LABEL = formatMegabytesLabel(
  MAX_ORIGINAL_FILE_BYTES
);

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

const constantsLabelsByLocale: Record<AppLocale, any> = {
  ca: (caMessages as any).Components.Constants,
  es: (esMessages as any).Components.Constants,
  en: (enMessages as any).Components.Constants,
};

const defaultConstantsLabels = constantsLabelsByLocale[DEFAULT_LOCALE];

// Localized constants (sync for server components/tests) – default to Catalan
export const DAY_NAMES: string[] = defaultConstantsLabels.days as string[];
export const MONTH_NAMES: string[] = defaultConstantsLabels.months as string[];
export const MONTHS_URL: string[] =
  defaultConstantsLabels.monthsUrl as string[];
export const NEWS_HUBS = [
  { slug: "mataro", name: defaultConstantsLabels.newsHubs.mataro as string },
  {
    slug: "barcelona",
    name: defaultConstantsLabels.newsHubs.barcelona as string,
  },
  {
    slug: "tarragona",
    name: defaultConstantsLabels.newsHubs.tarragona as string,
  },
  { slug: "lleida", name: defaultConstantsLabels.newsHubs.lleida as string },
];
export const NEARBY_PLACES_BY_HUB: Record<
  string,
  { slug: string; name: string }[]
> = Object.entries(
  defaultConstantsLabels.nearbyHubs as Record<string, Record<string, string>>
).reduce((acc, [hub, places]) => {
  acc[hub] = Object.entries(places).map(([slug, name]) => ({
    slug,
    name,
  }));
  return acc;
}, {} as Record<string, { slug: string; name: string }[]>);

export function getDayNames(locale: AppLocale = DEFAULT_LOCALE): string[] {
  return (constantsLabelsByLocale[locale] ?? defaultConstantsLabels)
    .days as string[];
}

export function getMonthNames(locale: AppLocale = DEFAULT_LOCALE): string[] {
  return (constantsLabelsByLocale[locale] ?? defaultConstantsLabels)
    .months as string[];
}

export function getMonthUrlNames(locale: AppLocale = DEFAULT_LOCALE): string[] {
  return (constantsLabelsByLocale[locale] ?? defaultConstantsLabels)
    .monthsUrl as string[];
}

// Legacy category constants removed - API is now the source of truth

export const BYDATES: ByDateOption[] = [
  { value: "avui", labelKey: "today" },
  { value: "dema", labelKey: "tomorrow" },
  { value: "cap-de-setmana", labelKey: "weekend" },
  { value: "setmana", labelKey: "week" },
];

/**
 * Maps date slugs to their corresponding translation label keys.
 * Used for consistent date label resolution across the application.
 */
export const dateFunctions: { [key: string]: string } = {
  avui: "today",
  dema: "tomorrow",
  setmana: "week",
  "cap-de-setmana": "weekend",
};

/**
 * Type-safe helper to get date label key from slug.
 * Reuses dateFunctions to avoid duplication.
 */
export function getDateLabelKey(
  slug: string
): "today" | "tomorrow" | "week" | "weekend" | undefined {
  const key = dateFunctions[slug];
  if (
    key === "today" ||
    key === "tomorrow" ||
    key === "week" ||
    key === "weekend"
  ) {
    return key;
  }
  return undefined;
}

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
export async function getNewsHubs(): Promise<{ slug: string; name: string }[]> {
  const t = await getTranslations("Components.Constants.newsHubs");
  return NEWS_HUBS.map((hub) => ({
    slug: hub.slug,
    name: t(hub.slug),
  }));
}

export async function getNearbyPlacesByHub(): Promise<
  Record<string, { slug: string; name: string }[]>
> {
  const t = await getTranslations("Components.Constants.nearbyHubs");
  return Object.fromEntries(
    Object.entries(
      defaultConstantsLabels.nearbyHubs as Record<
        string,
        Record<string, string>
      >
    ).map(([hub, places]) => [
      hub,
      Object.entries(places).map(([slug]) => ({
        slug,
        name: t(`${hub}.${slug}`),
      })),
    ])
  );
}

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
