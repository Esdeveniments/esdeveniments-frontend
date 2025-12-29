import { findCategoryBySlug } from "./category-mapping";
import type { CategorySummaryResponseDTO } from "types/api/category";
import { CATEGORY_CONFIG } from "@config/categories";

/**
 * Finds a category by slug in dynamic category data
 * Returns null if not found
 */
export function findCategoryBySlugDynamic(
  categories: CategorySummaryResponseDTO[],
  slug: string
): CategorySummaryResponseDTO | null {
  return findCategoryBySlug(categories, slug);
}

/**
 * Gets category from dynamic data (API is source of truth)
 */
export function getCategoryFromDynamicData(
  categories: CategorySummaryResponseDTO[],
  identifier: string | number
): CategorySummaryResponseDTO | null {
  if (!categories || !Array.isArray(categories)) {
    return null;
  }

  // If identifier is a number, find by ID
  if (typeof identifier === "number") {
    return categories.find((cat) => cat.id === identifier) || null;
  }

  // If identifier is a string, try different approaches
  if (typeof identifier === "string") {
    // First try to find by slug
    const bySlug = findCategoryBySlug(categories, identifier);
    if (bySlug) return bySlug;

    // Then try to find by name (exact match)
    const byName = categories.find(
      (cat) => cat.name.toLowerCase() === identifier.toLowerCase()
    );
    if (byName) return byName;
  }

  return null;
}

/**
 * Gets category ID from various identifier types
 * Useful for API calls that require category ID
 */
export function getCategoryId(
  categories: CategorySummaryResponseDTO[],
  identifier: string | number | CategorySummaryResponseDTO
): number | null {
  if (typeof identifier === "number") {
    return identifier;
  }

  if (typeof identifier === "object" && identifier?.id) {
    return identifier.id;
  }

  if (typeof identifier === "string") {
    const category = getCategoryFromDynamicData(categories, identifier);
    return category?.id || null;
  }

  return null;
}

/**
 * Creates a display-friendly name from category data
 * Falls back to slug or ID if name is not available
 */
export function getCategoryDisplayName(
  category: CategorySummaryResponseDTO | null
): string {
  if (!category) return "";

  return category.name || category.slug || `Category ${category.id}`;
}

/**
 * Localizes a category label when the slug is known in CATEGORY_CONFIG.
 * Falls back to the backend-provided name (or slug) when unknown.
 */
export function getLocalizedCategoryLabelFromConfig(
  slug: unknown,
  fallbackName: string,
  tCategories: (key: string) => string
): string {
  const normalizedSlug = typeof slug === "string" ? slug.toLowerCase() : "";
  const config = normalizedSlug ? CATEGORY_CONFIG[normalizedSlug] : undefined;
  if (config?.labelKey) {
    return tCategories(config.labelKey);
  }
  return fallbackName;
}
