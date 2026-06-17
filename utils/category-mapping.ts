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
