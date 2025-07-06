import type { CategoryKey, CategoryValue } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import { CATEGORIES } from "./constants";

/**
 * Maps a legacy category key to a URL-friendly slug
 * This function creates backward-compatible slugs for ISR route generation
 */
export function mapLegacyCategoryToSlug(categoryKey: CategoryKey): string {
  const slugMap: Record<CategoryKey, string> = {
    "Festes Majors": "festes-majors",
    Festivals: "festivals",
    Familiar: "familiar",
    Música: "musica",
    Cinema: "cinema",
    Teatre: "teatre",
    Exposicions: "exposicions",
    Fires: "fires",
    Espectacles: "espectacles",
  };

  return slugMap[categoryKey] || categoryKey.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Finds a category by slug in the dynamic categories array
 * Returns null if not found
 */
export function findCategoryBySlug(
  categories: CategorySummaryResponseDTO[],
  slug: string
): CategorySummaryResponseDTO | null {
  if (!categories || !Array.isArray(categories)) {
    return null;
  }

  return categories.find((category) => category.slug === slug) || null;
}

/**
 * Creates a lookup map for categories by slug for faster access
 * Used for ISR and URL routing optimization
 */
export function createCategoryLookupMap(
  categories: CategorySummaryResponseDTO[]
): Map<string, CategorySummaryResponseDTO> {
  const lookupMap = new Map<string, CategorySummaryResponseDTO>();

  if (!categories || !Array.isArray(categories)) {
    return lookupMap;
  }

  categories.forEach((category) => {
    if (category.slug) {
      lookupMap.set(category.slug, category);
    }
  });

  return lookupMap;
}

/**
 * Returns default/fallback categories when API fails
 * These mirror the static CATEGORIES object but in the dynamic format
 */
export function getDefaultCategories(): CategorySummaryResponseDTO[] {
  return Object.entries(CATEGORIES).map(([key], index) => ({
    id: index + 1, // Temporary IDs for fallback
    name: key,
    slug: mapLegacyCategoryToSlug(key as CategoryKey),
  }));
}

/**
 * Gets URL slug for a category key (for ISR route generation)
 * Falls back to legacy mapping if dynamic data not available
 */
export function getCategorySlug(categoryKey: CategoryKey): string {
  return mapLegacyCategoryToSlug(categoryKey);
}

/**
 * Gets category by slug from categories array (for ISR)
 * Returns null if not found
 */
export function getCategoryBySlug(
  categories: CategorySummaryResponseDTO[],
  slug: string
): CategorySummaryResponseDTO | null {
  return findCategoryBySlug(categories, slug);
}

/**
 * Maps legacy CategoryValue to corresponding dynamic category
 * Used during transition period for backward compatibility
 */
export function mapLegacyValueToCategory(
  categories: CategorySummaryResponseDTO[],
  categoryValue: CategoryValue
): CategorySummaryResponseDTO | null {
  if (!categories || !Array.isArray(categories)) {
    return null;
  }

  // Find the legacy key that maps to this value
  const legacyKey = Object.entries(CATEGORIES).find(
    ([_, value]) => value === categoryValue
  )?.[0] as CategoryKey | undefined;

  if (!legacyKey) {
    return null;
  }

  // Convert legacy key to slug and find in dynamic categories
  const slug = mapLegacyCategoryToSlug(legacyKey);
  return findCategoryBySlug(categories, slug);
}

/**
 * Creates a bidirectional mapping between legacy and dynamic categories
 * Used for migration and compatibility
 */
export function createLegacyDynamicMap(
  categories: CategorySummaryResponseDTO[]
): {
  legacyToSlug: Map<CategoryKey, string>;
  slugToLegacy: Map<string, CategoryKey>;
} {
  const legacyToSlug = new Map<CategoryKey, string>();
  const slugToLegacy = new Map<string, CategoryKey>();

  Object.keys(CATEGORIES).forEach((key) => {
    const categoryKey = key as CategoryKey;
    const slug = mapLegacyCategoryToSlug(categoryKey);

    legacyToSlug.set(categoryKey, slug);
    slugToLegacy.set(slug, categoryKey);
  });

  // Also map dynamic categories that might have different slugs
  categories.forEach((category) => {
    // Try to find corresponding legacy key by name similarity
    const matchingLegacyKey = Object.keys(CATEGORIES).find(
      (key) => key.toLowerCase() === category.name.toLowerCase()
    ) as CategoryKey | undefined;

    if (matchingLegacyKey && !slugToLegacy.has(category.slug)) {
      legacyToSlug.set(matchingLegacyKey, category.slug);
      slugToLegacy.set(category.slug, matchingLegacyKey);
    }
  });

  return { legacyToSlug, slugToLegacy };
}

/**
 * Validates if a category slug is valid for ISR generation
 */
export function isValidCategorySlug(slug: string): boolean {
  return (
    typeof slug === "string" && slug.length > 0 && /^[a-z0-9-]+$/.test(slug)
  );
}

/**
 * Generates all possible category slugs for ISR pre-generation
 * Returns both legacy-mapped slugs and dynamic category slugs
 */
export function getAllCategorySlugs(
  categories: CategorySummaryResponseDTO[] = []
): string[] {
  const slugs = new Set<string>();

  // Add legacy category slugs
  Object.keys(CATEGORIES).forEach((key) => {
    const slug = mapLegacyCategoryToSlug(key as CategoryKey);
    if (isValidCategorySlug(slug)) {
      slugs.add(slug);
    }
  });

  // Add dynamic category slugs
  categories.forEach((category) => {
    if (isValidCategorySlug(category.slug)) {
      slugs.add(category.slug);
    }
  });

  return Array.from(slugs).sort();
}
