import { JSX } from "react";
import AdjustmentsIcon from "@heroicons/react/outline/AdjustmentsIcon";
import { BYDATES } from "@utils/constants";
import { FilterState, buildFilterUrl } from "@utils/url-filters";
import FilterButton from "./FilterButton";
import { ServerFiltersProps } from "types/props";

const ServerFilters = ({
  segments,
  queryParams,
  categories = [],
  onOpenModal,
}: ServerFiltersProps): JSX.Element => {
  // Convert URL data to filter state for display
  const filters: FilterState = {
    place: segments.place || "catalunya",
    byDate: segments.date || "tots", // Simplified initialization
    category: segments.category || "tots",
    searchTerm: queryParams.search || "",
    distance: parseInt(queryParams.distance || "50"),
  };

  const isAnyFilterSelected = (): boolean =>
    segments.place !== "catalunya" ||
    segments.date !== "tots" ||
    segments.category !== "tots" ||
    Boolean(queryParams.search) ||
    Boolean(queryParams.distance && queryParams.distance !== "50");

  const getText = (value: string | undefined, defaultValue: string): string =>
    value && value !== "catalunya" && value !== "tots" && value !== "tots"
      ? value
      : defaultValue;

  const foundByDate = BYDATES.find((item) => item.value === filters.byDate);

  // Get category display name from dynamic categories
  const getCategoryDisplayName = (categorySlug: string): string | undefined => {
    if (categorySlug === "tots") return undefined;

    const category = categories.find((cat) => cat.slug === categorySlug);
    return category ? category.name.toUpperCase() : undefined;
  };

  // Build URLs for filter removal
  const getRemoveUrl = (filterType: keyof FilterState): string => {
    const changes: Partial<FilterState> = {};

    switch (filterType) {
      case "place":
        changes.place = "catalunya";
        break;
      case "byDate":
        if (segments.place === "catalunya" && segments.category === "tots") {
          return "/";
        }
        changes.byDate = "tots";
        break;
      case "category":
        changes.category = "tots";
        break;
      case "distance":
        changes.distance = 50;
        break;
    }

    return buildFilterUrl(segments, queryParams, changes);
  };

  return (
    <div className="w-full bg-whiteCorp flex justify-center items-center mt-2">
      <div className="w-full h-10 flex justify-start items-center cursor-pointer">
        <div
          onClick={onOpenModal}
          className="mr-3 flex justify-center items-center gap-3 cursor-pointer"
        >
          <AdjustmentsIcon
            className={
              isAnyFilterSelected()
                ? "w-5 h-5 text-primary"
                : "w-5 h-5 text-blackCorp"
            }
            aria-hidden="true"
          />
          <p className="hidden md:block uppercase italic font-semibold font-barlow text-[16px]">
            Filtres
          </p>
        </div>
        <div className="w-8/10 flex items-center gap-1 border-0 placeholder:text-bColor overflow-x-auto">
          <FilterButton
            text={getText(
              filters.place === "catalunya" ? undefined : filters.place,
              "Població"
            )}
            enabled={filters.place !== "catalunya"}
            removeUrl={getRemoveUrl("place")}
            onOpenModal={onOpenModal}
          />
          <FilterButton
            text={getText(
              getCategoryDisplayName(filters.category),
              "Categoria"
            )}
            enabled={filters.category !== "tots"}
            removeUrl={getRemoveUrl("category")}
            onOpenModal={onOpenModal}
          />
          <FilterButton
            text={getText(foundByDate?.label, "Data")}
            enabled={filters.byDate !== "tots"} // Simplified enabled logic
            removeUrl={getRemoveUrl("byDate")}
            onOpenModal={onOpenModal}
          />
          <FilterButton
            text={getText(
              filters.distance !== 50 ? `${filters.distance} km` : undefined,
              "Distància"
            )}
            enabled={filters.distance !== 50}
            removeUrl={getRemoveUrl("distance")}
            onOpenModal={onOpenModal}
          />
        </div>
      </div>
    </div>
  );
};

export default ServerFilters;
