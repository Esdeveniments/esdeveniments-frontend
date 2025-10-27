import { JSX } from "react";
import AdjustmentsIcon from "@heroicons/react/outline/AdjustmentsIcon";
import { FilterOperations } from "@utils/filter-operations";
import type { FilterDisplayState } from "types/filters";
import FilterButton from "./FilterButton";
import { ServerFiltersProps } from "types/props";

const ServerFilters = ({
  segments,
  queryParams,
  categories = [],
  placeTypeLabel,
  onOpenModal,
}: ServerFiltersProps): JSX.Element => {
  // Convert URL data to filter state for display
  const filters = {
    place: segments.place || "catalunya",
    byDate: segments.date || "tots",
    category: segments.category || "tots",
    searchTerm: queryParams.search || "",
    distance: parseInt(queryParams.distance || "50"),
    lat: queryParams.lat ? parseFloat(queryParams.lat) : undefined,
    lon: queryParams.lon ? parseFloat(queryParams.lon) : undefined,
  };

  // Create display state for configuration-driven operations
  const displayState: FilterDisplayState = {
    filters,
    queryParams,
    segments,
    extraData: { categories, placeTypeLabel },
  };

  const configurations = FilterOperations.getAllConfigurations();

  const isAnyFilterSelected = (): boolean => {
    return FilterOperations.hasActiveFilters(displayState);
  };

  const getText = (value: string | undefined, defaultValue: string): string =>
    value || defaultValue;

  return (
    <div className="w-full bg-background flex justify-center items-center mt-2">
      <div className="w-full h-10 flex justify-start items-center cursor-pointer">
        <div
          onClick={onOpenModal}
          className="mr-3 flex justify-center items-center gap-3 cursor-pointer"
          data-testid="filters-open"
        >
          <AdjustmentsIcon
            className={
              isAnyFilterSelected()
                ? "w-5 h-5 text-primary"
                : "w-5 h-5 text-foreground-strong"
            }
            aria-hidden="true"
          />
          <p className="hidden md:block uppercase italic font-semibold font-barlow text-[16px]">
            Filtres
          </p>
        </div>
        <div
          className="flex-1 flex items-center gap-1 border-0 placeholder:text-border overflow-x-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#cccccc transparent",
          }}
        >
          {configurations.map((config) => (
            <FilterButton
              key={config.key}
              text={getText(
                FilterOperations.getDisplayText(config.key, displayState),
                config.displayName
              )}
              enabled={FilterOperations.isEnabled(config.key, displayState)}
              removeUrl={FilterOperations.getRemovalUrl(
                config.key,
                segments,
                queryParams
              )}
              onOpenModal={onOpenModal}
              testId={`filter-pill-${config.key}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServerFilters;
