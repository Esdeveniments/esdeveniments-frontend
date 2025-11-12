import type { Option } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";

export const MAX_RESULTS = 15;

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

export const CATEGORIES: Record<string, string> = {
  "Festes Majors": "Festa Major",
  Festivals: "Festival",
  Familiar: "Familiar",
  Música: "Música",
  Cinema: "Cinema",
  Teatre: "Teatre",
  Exposicions: "Exposició",
  Fires: "Fira",
  Espectacles: "Espectacles",
};

export const SEARCH_TERMS_SUBSET: string[] = [
  "Festa Major",
  "Festival",
  "Familiar",
  "Música",
];

export const CATEGORY_NAMES_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORIES).map(([displayName, searchTerm]) => [
    searchTerm,
    displayName,
  ])
);

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
 * Get category names mapping (dynamic or static fallback)
 * @param categories - Dynamic categories from API
 * @returns Record mapping category values to display names
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

  // Fallback to static mapping
  return CATEGORY_NAMES_MAP;
}

/**
 * Get search terms subset (dynamic or static fallback)
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

  // Fallback to static subset
  return SEARCH_TERMS_SUBSET;
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
 * Get category display name (dynamic or static fallback)
 * @param categorySlug - Category slug or key
 * @param categories - Dynamic categories from API
 * @returns Display name for the category
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

  // Fallback to static mapping
  return CATEGORY_NAMES_MAP[categorySlug] || categorySlug;
}

// --- News UI constants ---
export const NEWS_HUBS: { slug: string; name: string }[] = [
  { slug: "barcelona", name: "Barcelona" },
  { slug: "girona", name: "Girona" },
  { slug: "tarragona", name: "Tarragona" },
  { slug: "lleida", name: "Lleida" },
];

export const NEARBY_PLACES_BY_HUB: Record<
  string,
  { slug: string; name: string }[]
> = {
  barcelona: [
    { slug: "l-hospitalet-de-llobregat", name: "L'Hospitalet de Llobregat" },
    { slug: "badalona", name: "Badalona" },
    { slug: "sant-just-desvern", name: "Sant Just Desvern" },
    { slug: "cardedeu", name: "Cardedeu" },
    { slug: "granollers", name: "Granollers" },
    { slug: "castelldefels", name: "Castelldefels" },
  ],
  girona: [
    { slug: "figueres", name: "Figueres" },
    { slug: "blanes", name: "Blanes" },
    { slug: "olot", name: "Olot" },
  ],
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
