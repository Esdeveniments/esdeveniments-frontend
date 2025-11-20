import Badge from "@components/ui/common/badge";
import { buildCanonicalUrl } from "@utils/url-filters";
import type { CategorySummaryResponseDTO } from "types/api/category";

interface DateFilterBadgesProps {
  placeSlug: string;
  categorySlug?: string;
  categories?: CategorySummaryResponseDTO[];
  contextName: string;
  ariaLabel?: string;
}

export function DateFilterBadges({
  placeSlug,
  categorySlug,
  categories,
  contextName,
  ariaLabel = "Vegeu també",
}: DateFilterBadgesProps) {
  const dateFilters = [
    { slug: "avui", label: "Avui", ariaLabelText: `Veure activitats d'avui` },
    { slug: "dema", label: "Demà", ariaLabelText: `Veure activitats de demà` },
    {
      slug: "cap-de-setmana",
      label: "Cap de setmana",
      ariaLabelText: `Veure activitats aquest cap de setmana`,
    },
  ];

  // Determine the aria label pattern based on whether we have a category
  const getAriaLabel = (dateFilter: typeof dateFilters[0]) => {
    if (categorySlug) {
      return `${dateFilter.ariaLabelText} per la categoria ${contextName}`;
    }
    return `${dateFilter.ariaLabelText} a ${contextName}`;
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
    <nav aria-label={ariaLabel} className="mt-element-gap-sm mb-element-gap-sm">
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

