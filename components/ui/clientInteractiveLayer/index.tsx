"use client";

import { memo, useEffect, useState, Suspense, useCallback } from "react";
import NextImage from "next/image";
import { useScrollVisibility } from "@components/hooks/useScrollVisibility";
import { useHydration } from "@components/hooks/useHydration";
import { useSearchParams, usePathname } from "next/navigation"; // Added usePathname
import Search from "@components/ui/search";
import ServerFilters from "@components/ui/filters/ServerFilters";
import NavigationFiltersModal from "@components/ui/filtersModal/NavigationFiltersModal";
import { parseFiltersFromUrl } from "@utils/url-filters";
import { extractURLSegments, debugURLParsing } from "@utils/url-parsing";
import { ClientInteractiveLayerProps } from "types/props";
import Imago from "@public/static/images/imago-esdeveniments.png";

function debounce(func: () => void, wait: number): () => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return function (): void {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(), wait);
  };
}

function ClientInteractiveLayer({
  categories = [],
  placeTypeLabel,
}: ClientInteractiveLayerProps) {
  const isSticky = useScrollVisibility(30);
  const isHydrated = useHydration();
  const [scrollIcon, setScrollIcon] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<
    { latitude: number; longitude: number } | undefined
  >();
  const searchParams = useSearchParams();
  const pathname = usePathname(); // Get current pathname

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const handleScroll = debounce(() => {
      setScrollIcon(window.scrollY > 400);
    }, 200);

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHydrated]);

  // Prevent hydration mismatch by using consistent initial state
  const stickyClasses =
    isHydrated && isSticky
      ? "top-10 z-5"
      : "!top-0 z-10 md:top-10 border-bColor md:border-b-0 shadow-sm md:shadow-none";

  // Determine if it's the home page
  const isHomePage = pathname === "/";

  // Parse current URL segments from pathname - this is the key fix!
  const urlSegments = extractURLSegments(pathname || "/");

  // Parse current URL state for filters and modal
  const urlSearchParams = new URLSearchParams(searchParams?.toString() || "");
  const parsed = parseFiltersFromUrl(
    urlSegments,
    urlSearchParams,
    categories // Pass dynamic categories for proper validation
  );

  // Initialize user location from URL params if available
  useEffect(() => {
    const lat = parsed.queryParams.lat;
    const lon = parsed.queryParams.lon;
    if (lat && lon) {
      setUserLocation({
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
      });
    } else {
      // Clear user location when lat/lon are not in URL
      setUserLocation(undefined);
    }
  }, [parsed.queryParams.lat, parsed.queryParams.lon]);

  // Debug URL parsing in development
  debugURLParsing(pathname || "/", urlSegments, parsed);

  return (
    <>
      {/* Floating Scroll Button */}
      <div
        onClick={() =>
          isHydrated && window.scrollTo({ top: 0, behavior: "smooth" })
        }
        className={`w-14 h-14 flex justify-center items-center bg-whiteCorp rounded-md shadow-xl cursor-pointer ${
          isHydrated && scrollIcon
            ? "fixed z-10 bottom-28 right-10 flex justify-end animate-appear"
            : "hidden"
        }`}
      >
        <NextImage
          src={Imago}
          className="p-1"
          width={28}
          height={28}
          alt="Esdeveniments.cat"
        />
      </div>

      {/* Fixed Search and Filters Bar */}
      <div
        className={`w-full bg-whiteCorp fixed transition-all duration-500 ease-in-out ${stickyClasses} flex justify-center items-center pt-2`}
      >
        <div className="w-full flex flex-col justify-center items-center md:items-start mx-auto px-2 pt-2 pb-2 sm:w-[580px] md:w-[768px] lg:w-[1024px]">
          <Suspense
            fallback={
              <div className="w-full h-12 bg-whiteCorp animate-pulse rounded-full" />
            }
          >
            <Search />
          </Suspense>
          {!isHomePage && ( // Conditionally render ServerFilters
            <ServerFilters
              segments={parsed.segments}
              queryParams={parsed.queryParams}
              categories={categories}
              placeTypeLabel={placeTypeLabel}
              onOpenModal={handleOpenModal}
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

export default memo(ClientInteractiveLayer);
