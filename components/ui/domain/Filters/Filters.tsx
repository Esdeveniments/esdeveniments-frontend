"use client";

import { useState, useCallback, useRef, JSX } from "react";
import { FilterOperations } from "@utils/filter-operations";
import type { FilterDisplayState } from "types/filters";
import type { FiltersProps } from "types/ui/domain";
import FilterButton from "../../filters/FilterButton";
import FilterErrorBoundary from "../../filters/FilterErrorBoundary";
import NavigationFiltersModal from "../../filtersModal";
import AdjustmentsIcon from "@heroicons/react/outline/AdjustmentsIcon";
import { Text } from "../../primitives/Text";

/**
 * Domain component for event filtering functionality.
 * Combines filter display, modal interaction, and state management
 * for a cohesive filtering experience.
 */
const Filters = ({
  segments,
  queryParams,
  categories = [],
  placeTypeLabel,
  userLocation,
  onFiltersApplied: _onFiltersApplied,
  className = "",
}: FiltersProps): JSX.Element => {
  // State management for modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Ref for focus management
  const filtersContainerRef = useRef<HTMLDivElement>(null);

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

  // Modal handlers with accessibility
  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    // Return focus to the filters trigger button
    setTimeout(() => {
      const triggerButton = filtersContainerRef.current?.querySelector(
        '[data-testid="filters-open"]',
      ) as HTMLElement;
      triggerButton?.focus();
    }, 100);
  }, []);

  return (
    <FilterErrorBoundary>
      <div
        ref={filtersContainerRef}
        className={`mt-component-sm flex w-full items-center justify-center bg-whiteCorp ${className}`}
        role="region"
        aria-label="Event filters"
      >
        <div className="flex h-10 w-full cursor-pointer items-center justify-start">
          {/* Filter trigger button */}
          <button
            onClick={handleOpenModal}
            className="mr-component-md flex cursor-pointer items-center justify-center gap-component-md rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            data-testid="filters-open"
            aria-label={`${isAnyFilterSelected() ? "Modify active filters" : "Open filters"}`}
            aria-expanded={isModalOpen}
            aria-haspopup="dialog"
            type="button"
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
              as="span"
              variant="body"
              className="hidden font-barlow font-semibold uppercase italic md:block"
            >
              Filtres
            </Text>
          </button>

          {/* Active filter pills */}
          <div
            className="gap-xs flex flex-1 items-center overflow-x-auto border-0 placeholder:text-bColor"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#cccccc transparent",
            }}
            role="group"
            aria-label="Active filters"
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
                onOpenModal={handleOpenModal}
                testId={`filter-pill-${config.key}`}
              />
            ))}
          </div>
        </div>

        {/* Filter modal */}
        <NavigationFiltersModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          currentSegments={segments}
          currentQueryParams={queryParams}
          userLocation={
            userLocation
              ? "coords" in userLocation
                ? {
                    latitude: userLocation.coords.latitude,
                    longitude: userLocation.coords.longitude,
                  }
                : userLocation
              : undefined
          }
          categories={categories}
        />
      </div>
    </FilterErrorBoundary>
  );
};

export default Filters;
