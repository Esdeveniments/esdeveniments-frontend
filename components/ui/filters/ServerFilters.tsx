import { JSX } from "react";
import AdjustmentsIcon from "@heroicons/react/outline/AdjustmentsIcon";
import { FilterOperations } from "@utils/filter-operations";
import type { FilterDisplayState } from "types/filters";
import FilterButton from "./FilterButton";
import { ServerFiltersProps } from "types/props";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";

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
    byDate: segments.date || DEFAULT_FILTER_VALUE,
    category: segments.category || DEFAULT_FILTER_VALUE,
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

  // Filter out searchTerm - it's always visible in the search input, no need for chip
  const visibleConfigurations = configurations.filter(
    (config) => config.key !== "searchTerm"
  );

  const sortedConfigurations = visibleConfigurations
    .map((config) => ({
      config,
      enabled: FilterOperations.isEnabled(config.key, displayState),
    }))
    .sort((a, b) => Number(b.enabled) - Number(a.enabled));

  return (
    <div className="w-full bg-background flex justify-center items-center mt-element-gap">
      <div className="w-full h-10 flex justify-start items-center cursor-pointer">
        <div
          onClick={onOpenModal}
          className="mr-element-gap flex justify-center items-center gap-element-gap cursor-pointer"
          data-testid="filters-open"
        >
          <AdjustmentsIcon
            className={
              isAnyFilterSelected()
                ? "w-5 h-5 text-primary"
                : "w-5 h-5 text-foreground-strong hover:text-primary"
            }
            aria-hidden="true"
          />
          <p className="hidden md:block body-small font-medium">Filtres</p>
        </div>
        <div
          className="flex-1 flex items-center gap-element-gap-sm border-0 placeholder:text-border overflow-x-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#cccccc transparent",
          }}
        >
          {sortedConfigurations.map(({ config, enabled }) => (
            <FilterButton
              key={config.key}
              text={getText(
                FilterOperations.getDisplayText(config.key, displayState),
                config.displayName
              )}
              enabled={enabled}
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
