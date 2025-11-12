import type { CategorySummaryResponseDTO } from "types/api/category";
import { CATEGORIES } from "./constants";

/**
 * Maps a legacy category key to a URL-friendly slug
 * This function creates backward-compatible slugs for ISR route generation
 */
export function mapLegacyCategoryToSlug(categoryKey: string): string {
  const slugMap: Record<string, string> = {
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
 * Gets URL slug for a category key (for ISR route generation)
 * Falls back to legacy mapping if dynamic data not available
 */
export function getCategorySlug(categoryKey: string): string {
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
  categoryValue: string
): CategorySummaryResponseDTO | null {
  if (!categories || !Array.isArray(categories)) {
    return null;
  }

  // Find the legacy key that maps to this value
  const legacyKey = Object.entries(CATEGORIES).find(
    ([_, value]) => value === categoryValue
  )?.[0] as string | undefined;

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
  legacyToSlug: Map<string, string>;
  slugToLegacy: Map<string, string>;
} {
  const legacyToSlug = new Map<string, string>();
  const slugToLegacy = new Map<string, string>();

  Object.keys(CATEGORIES).forEach((key) => {
    const categoryKey = key;
    const slug = mapLegacyCategoryToSlug(categoryKey);

    legacyToSlug.set(categoryKey, slug);
    slugToLegacy.set(slug, categoryKey);
  });

  // Also map dynamic categories that might have different slugs
  categories.forEach((category) => {
    // Try to find corresponding legacy key by name similarity
    const matchingLegacyKey = Object.keys(CATEGORIES).find(
      (key) => key.toLowerCase() === category.name.toLowerCase()
    ) as string | undefined;

    if (matchingLegacyKey && !slugToLegacy.has(category.slug)) {
      legacyToSlug.set(matchingLegacyKey, category.slug);
      slugToLegacy.set(category.slug, matchingLegacyKey);
    }
  });

  return { legacyToSlug, slugToLegacy };
}

/**
 * Validates if a category slug has a valid format (security/DoS prevention)
 * Checks format only, not whether the category exists in the system
 * @param slug - The slug to validate
 * @param maxLength - Maximum allowed length (default: 64)
 * @returns true if the slug has valid format
 */
export function isValidCategorySlugFormat(
  slug: string,
  maxLength: number = 64
): boolean {
  return (
    typeof slug === "string" &&
    slug.length > 0 &&
    slug.length <= maxLength &&
    /^[a-z0-9-]+$/.test(slug)
  );
}

/**
 * Validates if a category slug is valid for ISR generation
 * @deprecated Use isValidCategorySlugFormat for format validation
 */
export function isValidCategorySlug(slug: string): boolean {
  return isValidCategorySlugFormat(slug, Infinity);
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
    const slug = mapLegacyCategoryToSlug(key);
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
