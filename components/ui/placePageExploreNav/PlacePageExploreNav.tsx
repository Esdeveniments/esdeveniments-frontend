import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import {
  DateFilterBadges,
  createDateFilterBadgeLabels,
} from "@components/ui/serverEventsCategorized/DateFilterBadges";
import CategoryQuicklinks from "./CategoryQuicklinks";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";
import type { PlacePageExploreNavProps } from "types/props";

/**
 * Server component that renders SEO-friendly internal navigation links.
 *
 * Displays:
 * - Date badges (avui, demà, cap de setmana) when no date is selected
 * - Category quicklinks when no category is selected
 *
 * Conditional visibility rules:
 * - /[place]: Show both date badges and category links
 * - /[place]/[byDate]: Hide date badges, show category links
 * - /[place]/[category]: Show date badges, hide category links
 * - /[place]/[byDate]/[category]: Hide both (fully filtered)
 */
export default async function PlacePageExploreNav({
  place,
  date,
  category,
  categories = [],
  placeLabel,
}: PlacePageExploreNavProps) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({
    locale,
    namespace: "Components.PlacePageExploreNav",
  });
  const tDateFilters = await getTranslations({
    locale,
    namespace: "Components.DateFilterBadges",
  });

  // Determine what to show based on current filter state
  const hasDate = !!date && date !== DEFAULT_FILTER_VALUE;
  const hasCategory = !!category && category !== DEFAULT_FILTER_VALUE;

  const showDateBadges = !hasDate;
  const showCategoryLinks = !hasCategory && categories.length > 0;

  // Don't render anything if both filters are already applied
  if (!showDateBadges && !showCategoryLinks) {
    return null;
  }

  // Prepare date filter badge labels
  const badgeLabels = createDateFilterBadgeLabels(tDateFilters);

  return (
    <section
      className="container border-t border-border/40 py-section-y"
      aria-label={t("sectionAriaLabel")}
    >
      {/* Date badges section */}
      {showDateBadges && (
        <div className="mb-element-gap">
          <h2 className="body-normal font-medium text-muted-foreground mb-element-gap-sm">
            {t("dateTitle")}
          </h2>
          <DateFilterBadges
            placeSlug={place}
            categorySlug={hasCategory ? category : undefined}
            categories={categories}
            contextName={placeLabel}
            ariaLabel={t("dateAriaLabel")}
            labels={badgeLabels}
          />
        </div>
      )}

      {/* Category quicklinks section */}
      {showCategoryLinks && (
        <CategoryQuicklinks
          place={place}
          date={hasDate ? date : undefined}
          categories={categories}
          placeLabel={placeLabel}
        />
      )}
    </section>
  );
}
