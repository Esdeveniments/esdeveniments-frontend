import { JSX } from "react";
import { Text } from "@components/ui/primitives";
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
    <div className="mt-component-sm flex w-full items-center justify-center bg-whiteCorp">
      <div className="flex h-10 w-full cursor-pointer items-center justify-start">
        <div
          onClick={onOpenModal}
          className="mr-component-md flex cursor-pointer items-center justify-center gap-component-md"
          data-testid="filters-open"
        >
          <AdjustmentsIcon
            className={
              isAnyFilterSelected()
                ? "h-5 w-5 text-primary"
                : "h-5 w-5 text-blackCorp"
            }
            aria-hidden="true"
          />
          <Text
            as="p"
            variant="body"
            size="base"
            className="hidden font-barlow font-semibold uppercase italic md:block"
          >
            Filtres
          </Text>
        </div>
        <div
          className="gap-xs flex flex-1 items-center overflow-x-auto border-0 placeholder:text-bColor"
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
                config.displayName,
              )}
              enabled={FilterOperations.isEnabled(config.key, displayState)}
              removeUrl={FilterOperations.getRemovalUrl(
                config.key,
                segments,
                queryParams,
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
