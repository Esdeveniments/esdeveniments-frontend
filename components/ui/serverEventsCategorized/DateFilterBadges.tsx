import Badge from "@components/ui/common/badge";
import { buildCanonicalUrl } from "@utils/url-filters";
import type {
  DateFilterBadgeLabels,
  DateFilterBadgesProps,
  TranslationFn,
} from "types/props";

const FALLBACK_DATE_FILTER_BADGE_LABELS: DateFilterBadgeLabels = {
  navAriaLabel: "Vegeu també",
  today: { label: "Avui", ariaLabelText: "Veure activitats d'avui" },
  tomorrow: {
    label: "Demà",
    ariaLabelText: "Veure activitats de demà",
  },
  weekend: {
    label: "Cap de setmana",
    ariaLabelText: "Veure activitats aquest cap de setmana",
  },
  ariaPlace: ({ ariaLabelText, contextName }) =>
    `${ariaLabelText} a ${contextName}`,
  ariaCategory: ({ ariaLabelText, contextName }) =>
    `${ariaLabelText} per la categoria ${contextName}`,
};

export const createDateFilterBadgeLabels = (
  t: TranslationFn
): DateFilterBadgeLabels => ({
  navAriaLabel: t("ariaLabel"),
  today: {
    label: t("today.label"),
    ariaLabelText: t("today.aria"),
  },
  tomorrow: {
    label: t("tomorrow.label"),
    ariaLabelText: t("tomorrow.aria"),
  },
  weekend: {
    label: t("weekend.label"),
    ariaLabelText: t("weekend.aria"),
  },
  ariaPlace: ({ ariaLabelText, contextName }) =>
    t("ariaPlace", { ariaLabelText, contextName }),
  ariaCategory: ({ ariaLabelText, contextName }) =>
    t("ariaCategory", { ariaLabelText, contextName }),
});

export function DateFilterBadges({
  placeSlug,
  categorySlug,
  categories,
  contextName,
  ariaLabel,
  labels,
}: DateFilterBadgesProps) {
  const resolvedLabels = labels ?? FALLBACK_DATE_FILTER_BADGE_LABELS;
  const resolvedAriaLabel = ariaLabel || resolvedLabels.navAriaLabel;
  const dateFilters = [
    {
      slug: "avui",
      label: resolvedLabels.today.label,
      ariaLabelText: resolvedLabels.today.ariaLabelText,
    },
    {
      slug: "dema",
      label: resolvedLabels.tomorrow.label,
      ariaLabelText: resolvedLabels.tomorrow.ariaLabelText,
    },
    {
      slug: "cap-de-setmana",
      label: resolvedLabels.weekend.label,
      ariaLabelText: resolvedLabels.weekend.ariaLabelText,
    },
  ];

  // Determine the aria label pattern based on whether we have a category
  const getAriaLabel = (dateFilter: typeof dateFilters[0]) => {
    if (categorySlug) {
      return resolvedLabels.ariaCategory({
        ariaLabelText: dateFilter.ariaLabelText,
        contextName,
      });
    }
    return resolvedLabels.ariaPlace({
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

