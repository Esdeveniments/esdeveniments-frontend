import type {
  Option,
  Categories,
  CategoryValue,
  CategoryKey,
} from "types/common";
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

export const CATEGORIES: Categories = {
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

export const CATEGORY_NAMES_MAP: Record<CategoryValue, CategoryKey> =
  Object.fromEntries(
    Object.entries(CATEGORIES).map(([displayName, searchTerm]) => [
      searchTerm,
      displayName,
    ])
  ) as Record<CategoryValue, CategoryKey>;

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
  return CATEGORY_NAMES_MAP[categorySlug as CategoryValue] || categorySlug;
}

// Promotion MVP constants (frontend-only; backend will own logic later)
export const PROMOTE_VISIBILITY = ["zona", "ciutat", "pais"] as const;
export const PROMOTE_DURATIONS = [2, 7, 15] as const;
export const PROMOTE_PRICING: Record<string, Record<number, number>> = {
  zona: { 2: 0.99, 7: 1.25, 15: 1.99 },
  ciutat: { 2: 1.49, 7: 2.49, 15: 3.99 },
  pais: { 2: 2.49, 7: 4.99, 15: 7.99 },
};
export const PROMOTE_KINDS = ["event", "business"] as const; // MVP types
export const PROMOTE_PLACEMENTS = ["global", "category", "newsletter"] as const; // where to appear
export const PROMOTE_PLACEMENT_MULTIPLIER: Record<string, number> = {
  global: 1.0, // home + lists + place pages
  category: 0.6, // only category pages
  newsletter: 0.8, // newsletter mention (future)
};
