import Badge from "@components/ui/common/badge";
import { getTranslations } from "next-intl/server";
import { buildCanonicalUrl } from "@utils/url-filters";
import type { DateFilterBadgesProps } from "types/props";
import type { JSX } from "react";

export async function DateFilterBadges({
  placeSlug,
  categorySlug,
  categories,
  contextName,
  ariaLabel,
}: DateFilterBadgesProps): Promise<JSX.Element> {
  const t = await getTranslations("Components.DateFilterBadges");
  const resolvedAriaLabel = ariaLabel || t("ariaLabel");
  const dateFilters = [
    { slug: "avui", label: t("today.label"), ariaLabelText: t("today.aria") },
    { slug: "dema", label: t("tomorrow.label"), ariaLabelText: t("tomorrow.aria") },
    {
      slug: "cap-de-setmana",
      label: t("weekend.label"),
      ariaLabelText: t("weekend.aria"),
    },
  ];

  // Determine the aria label pattern based on whether we have a category
  const getAriaLabel = (dateFilter: typeof dateFilters[0]) => {
    if (categorySlug) {
      return t("ariaCategory", {
        ariaLabelText: dateFilter.ariaLabelText,
        contextName,
      });
    }
    return t("ariaPlace", {
      ariaLabelText: dateFilter.ariaLabelText,
      contextName,
    });
  };

  // Build URL params - include category if provided
  const buildUrlParams = (byDate: string) => {
    const params: {
      place: string;
      byDate: string;
      category?: string;
    } = {
      place: placeSlug,
      byDate,
    };

    if (categorySlug) {
      params.category = categorySlug;
    }

    return params;
  };

  return (
    <nav aria-label={resolvedAriaLabel} className="mt-element-gap-sm mb-element-gap-sm">
      <ul className="flex gap-element-gap">
        {dateFilters.map((dateFilter) => (
          <li key={dateFilter.slug}>
            <Badge
              href={buildCanonicalUrl(
                buildUrlParams(dateFilter.slug),
                categories
              )}
              ariaLabel={getAriaLabel(dateFilter)}
            >
              {dateFilter.label}
            </Badge>
          </li>
        ))}
      </ul>
    </nav>
  );
}

