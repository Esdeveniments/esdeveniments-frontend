import type { BreadcrumbItem } from "types/common";
import type { AppLocale } from "types/i18n";
import { toLocalizedUrl } from "./i18n-seo";

/**
 * Adds the place breadcrumb if it's not the catalunya homepage.
 * 
 * @param breadcrumbs - The breadcrumbs array to modify
 * @param place - The place slug
 * @param placeLabel - The display label for the place
 * @param locale - The current locale
 */
export function addPlaceBreadcrumb(
  breadcrumbs: BreadcrumbItem[],
  place: string,
  placeLabel: string,
  locale: AppLocale
): void {
  if (place !== "catalunya") {
    breadcrumbs.push({
      name: placeLabel || place,
      url: toLocalizedUrl(`/${place}`, locale),
    });
  }
}

/**
 * Adds an intermediate date breadcrumb when both date and category are present.
 * This creates a breadcrumb for the date filter that appears before the category.
 * 
 * @param breadcrumbs - The breadcrumbs array to modify
 * @param place - The place slug
 * @param date - The date slug
 * @param dateLabel - The display label for the date (optional)
 * @param locale - The current locale
 */
export function addIntermediateDateBreadcrumb(
  breadcrumbs: BreadcrumbItem[],
  place: string,
  date: string,
  dateLabel: string | undefined,
  locale: AppLocale
): void {
  const datePath = `/${[place, date].filter(Boolean).join("/")}`;
  breadcrumbs.push({
    name: dateLabel || date,
    url: toLocalizedUrl(datePath, locale),
  });
}

/**
 * Adds the current page breadcrumb based on the scenario.
 * Handles cases where the current page is a date filter or category filter.
 * 
 * @param breadcrumbs - The breadcrumbs array to modify
 * @param hasSpecificDate - Whether a specific date filter is active
 * @param hasSpecificCategory - Whether a specific category filter is active
 * @param date - The date slug (optional)
 * @param dateLabel - The display label for the date (optional)
 * @param category - The category slug (optional)
 * @param categoryLabel - The display label for the category (optional)
 * @param currentUrl - The canonical URL for the current page
 */
export function addCurrentPageBreadcrumb(
  breadcrumbs: BreadcrumbItem[],
  hasSpecificDate: boolean,
  hasSpecificCategory: boolean,
  date: string | undefined,
  dateLabel: string | undefined,
  category: string | undefined,
  categoryLabel: string | undefined,
  currentUrl: string
): void {
  if (hasSpecificDate && !hasSpecificCategory) {
    // Current page is date only
    breadcrumbs.push({
      name: dateLabel || (date as string),
      url: currentUrl,
    });
  } else if (hasSpecificCategory) {
    // Current page is category (or place+category)
    breadcrumbs.push({
      name: categoryLabel || (category as string),
      url: currentUrl,
    });
  }
}

/**
 * Handles the catalunya homepage case by updating the home breadcrumb.
 * The catalunya place is treated as the homepage canonical.
 * 
 * @param breadcrumbs - The breadcrumbs array to modify
 * @param homeLabel - The display label for the home page
 * @param currentUrl - The canonical URL for the current page
 */
export function handleCatalunyaHomepage(
  breadcrumbs: BreadcrumbItem[],
  homeLabel: string,
  currentUrl: string
): void {
  breadcrumbs[0] = { name: homeLabel, url: currentUrl };
}

/**
 * Updates the place breadcrumb URL to be canonical for the current page.
 * Used when the current page is the place page itself (no filters).
 * 
 * @param breadcrumbs - The breadcrumbs array to modify
 * @param currentUrl - The canonical URL for the current page
 */
export function updatePlaceBreadcrumbUrl(
  breadcrumbs: BreadcrumbItem[],
  currentUrl: string
): void {
  breadcrumbs[breadcrumbs.length - 1] = {
    ...breadcrumbs[breadcrumbs.length - 1],
    url: currentUrl,
  };
}

