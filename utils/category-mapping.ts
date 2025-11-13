import type { CategorySummaryResponseDTO } from "types/api/category";

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
 * @deprecated Use dynamic categories from API instead
 * This function is kept for backward compatibility but should not be used
 */
export function getCategorySlug(categoryKey: string): string {
  // Simple slug conversion - no legacy mapping
  return categoryKey.toLowerCase().replace(/\s+/g, "-");
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
 *
 * 🛡️ SECURITY: Uses default maxLength (64) instead of Infinity to prevent DoS
 */
export function isValidCategorySlug(slug: string): boolean {
  return isValidCategorySlugFormat(slug, 64);
}

/**
 * Generates all possible category slugs for ISR pre-generation
 * Uses dynamic categories from API as source of truth
 */
export function getAllCategorySlugs(
  categories: CategorySummaryResponseDTO[] = []
): string[] {
  const slugs = new Set<string>();

  // Add dynamic category slugs only
  categories.forEach((category) => {
    if (isValidCategorySlugFormat(category.slug)) {
      slugs.add(category.slug);
    }
  });

  return Array.from(slugs).sort();
}
