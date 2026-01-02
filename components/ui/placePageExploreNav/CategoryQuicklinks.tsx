import Badge from "@components/ui/common/badge";
import { buildCanonicalUrl } from "@utils/url-filters";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import type { CategorySummaryResponseDTO } from "types/api/category";
import type { CategoryQuicklinksProps } from "types/props";
import { CATEGORY_CONFIG, PRIORITY_CATEGORY_SLUGS } from "@config/categories";

/**
 * Maximum number of category quicklinks to display.
 * Keep this low to avoid decision paralysis.
 */
const MAX_CATEGORIES = 6;

/**
 * Server component that renders category quicklinks for SEO internal linking.
 * Shows top categories based on priority configuration.
 */
export default async function CategoryQuicklinks({
  place,
  date,
  categories = [],
  placeLabel,
}: CategoryQuicklinksProps) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({
    locale,
    namespace: "Components.PlacePageExploreNav",
  });
  const tCategories = await getTranslations({
    locale,
    namespace: "Config.Categories",
  });

  // If no categories available, don't render
  if (categories.length === 0) {
    return null;
  }

  // Sort categories: priority first, then by API order
  const sortedCategories = [...categories].sort((a, b) => {
    const aIsPriority = PRIORITY_CATEGORY_SLUGS.includes(a.slug);
    const bIsPriority = PRIORITY_CATEGORY_SLUGS.includes(b.slug);

    if (aIsPriority && !bIsPriority) return -1;
    if (!aIsPriority && bIsPriority) return 1;

    // Both priority or both non-priority: maintain original order
    return 0;
  });

  // Take top N categories
  const displayCategories = sortedCategories.slice(0, MAX_CATEGORIES);

  /**
   * Get localized category label from config, falling back to API name.
   */
  const getCategoryLabel = (category: CategorySummaryResponseDTO): string => {
    const config = CATEGORY_CONFIG[category.slug];
    if (config?.labelKey) {
      return tCategories(config.labelKey);
    }
    return category.name;
  };

  /**
   * Build URL for category link, preserving date if already selected.
   */
  const buildCategoryUrl = (categorySlug: string): string => {
    return buildCanonicalUrl(
      {
        place,
        byDate: date,
        category: categorySlug,
      },
      categories
    );
  };

  return (
    <div>
      <h2 className="body-normal font-medium text-foreground/70 mb-element-gap-sm">
        {t("categoryTitle")}
      </h2>
      <nav aria-label={t("categoryAriaLabel")}>
        <ul className="flex flex-wrap gap-element-gap-sm">
          {displayCategories.map((category) => (
            <li key={category.id}>
              <Badge
                href={buildCategoryUrl(category.slug)}
                ariaLabel={t("categoryLinkAria", {
                  category: getCategoryLabel(category),
                  place: placeLabel,
                })}
              >
                {getCategoryLabel(category)}
              </Badge>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
