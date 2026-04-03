"use client";

import { memo, useState, Suspense, useCallback } from "react";
import { useNavbarVisible } from "@components/hooks/useNavbarVisible";
import { useHydration } from "@components/hooks/useHydration";
import { usePathname } from "next/navigation";
import Search from "@components/ui/search";
import FiltersClient from "@components/ui/filters/FiltersClient";
import NavigationFiltersModal from "@components/ui/filtersModal/NavigationFiltersModal";
import { debugURLParsing } from "@utils/url-parsing";
import {
  ClientInteractiveLayerProps,
  ClientInteractiveLayerContentProps,
} from "types/props";
import { useSharedUrlFilters } from "@components/context/UrlFiltersContext";

// Extract the parts that use useSearchParams and usePathname into a separate component
function ClientInteractiveLayerContent({
  categories = [],
  placeTypeLabel,
  filterLabels,
  isNavbarVisible,
  isHydrated,
  isModalOpen,
  handleOpenModal,
  handleCloseModal,
}: ClientInteractiveLayerContentProps) {
  const pathname = usePathname();
  const parsed = useSharedUrlFilters();

  // Determine if it's the home page
  const isHomePage = pathname === "/";

  const lat = parsed.queryParams.lat;
  const lon = parsed.queryParams.lon;
  const latitude = lat ? parseFloat(lat) : NaN;
  const longitude = lon ? parseFloat(lon) : NaN;
  const userLocation =
    lat && lon && !isNaN(latitude) && !isNaN(longitude)
      ? { latitude, longitude }
      : undefined;

  // Debug URL parsing in development
  debugURLParsing(pathname || "/", parsed.segments, parsed);

  // Prevent hydration mismatch by using consistent initial state
  // Use navbar visibility for robust positioning (works with mobile browser UI hide)
  // - When navbar is visible: place just below it (top-14)
  // - When navbar is out of view: stick to the very top (top-0)
  const stickyClasses =
    isHydrated && isNavbarVisible
      ? "top-14 z-sticky"
      : "!top-0 z-sticky border-border md:border-b-0 shadow-sm md:shadow-none pt-element-gap-sm";

  return (
    <>
      {/* Fixed Search and Filters Bar */}
      <div
        className={`w-full bg-background fixed inset-x-0 transition-all duration-500 ease-in-out ${stickyClasses} flex justify-center items-center md:pt-element-gap-sm`}
      >
        <div className="container flex flex-col justify-center items-center md:items-start">
          <Suspense
            fallback={
              <div className="w-full h-12 bg-background animate-pulse rounded-full" />
            }
          >
            <Search />
          </Suspense>
          {!isHomePage && ( // Conditionally render FiltersClient
            <FiltersClient
              segments={parsed.segments}
              queryParams={parsed.queryParams}
              categories={categories}
              placeTypeLabel={placeTypeLabel}
              onOpenModal={handleOpenModal}
              labels={filterLabels}
            />
          )}
        </div>
      </div>

      {/* Navigation-based Filters Modal */}
      <NavigationFiltersModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        currentSegments={parsed.segments}
        currentQueryParams={parsed.queryParams}
        userLocation={userLocation}
        categories={categories}
      />
    </>
  );
}

function ClientInteractiveLayer({
  categories = [],
  placeTypeLabel,
  filterLabels,
}: ClientInteractiveLayerProps) {
  const isNavbarVisible = useNavbarVisible();
  const isHydrated = useHydration();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <>
      <Suspense
        fallback={
          <div className="w-full h-12 bg-background animate-pulse rounded-full" />
        }
      >
        <ClientInteractiveLayerContent
          categories={categories}
          placeTypeLabel={placeTypeLabel}
          filterLabels={filterLabels}
          isNavbarVisible={isNavbarVisible}
          isHydrated={isHydrated}
          isModalOpen={isModalOpen}
          handleOpenModal={handleOpenModal}
          handleCloseModal={handleCloseModal}
        />
      </Suspense>
    </>
  );
}

export default memo(ClientInteractiveLayer);
