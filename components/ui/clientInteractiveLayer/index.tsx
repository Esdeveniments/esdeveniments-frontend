"use client";

import { memo, useEffect, useState, Suspense, useCallback } from "react";
import NextImage from "next/image";
import { useNavbarVisible } from "@components/hooks/useNavbarVisible";
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

// Extract the parts that use useSearchParams and usePathname into a separate component
function ClientInteractiveLayerContent({
  categories = [],
  placeTypeLabel,
  isNavbarVisible,
  isHydrated,
  isModalOpen,
  handleOpenModal,
  handleCloseModal,
}: ClientInteractiveLayerProps & {
  isNavbarVisible: boolean;
  isHydrated: boolean;
  scrollIcon: boolean;
  isModalOpen: boolean;
  handleOpenModal: () => void;
  handleCloseModal: () => void;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

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
  const lat = parsed.queryParams.lat;
  const lon = parsed.queryParams.lon;
  const latitude = lat ? parseFloat(lat) : NaN;
  const longitude = lon ? parseFloat(lon) : NaN;
  const userLocation =
    lat && lon && !isNaN(latitude) && !isNaN(longitude)
      ? { latitude, longitude }
      : undefined;

  // Debug URL parsing in development
  debugURLParsing(pathname || "/", urlSegments, parsed);

  // Prevent hydration mismatch by using consistent initial state
  // Use navbar visibility for robust positioning (works with mobile browser UI hide)
  // - When navbar is visible: place just below it (top-14)
  // - When navbar is out of view: stick to the very top (top-0)
  const stickyClasses =
    isHydrated && isNavbarVisible
      ? "top-14 z-sticky"
      : "!top-0 z-sticky border-border md:border-b-0 shadow-sm md:shadow-none";

  return (
    <>
      {/* Fixed Search and Filters Bar */}
      <div
        className={`w-full bg-background fixed inset-x-0 transition-all duration-500 ease-in-out ${stickyClasses} flex justify-center items-center pt-element-gap-sm`}
      >
        <div className="container flex flex-col justify-center items-center md:items-start px-section-x pt-element-gap-sm pb-element-gap-sm">
          <Suspense
            fallback={
              <div className="w-full h-12 bg-background animate-pulse rounded-full" />
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

function ClientInteractiveLayer({
  categories = [],
  placeTypeLabel,
}: ClientInteractiveLayerProps) {
  const isNavbarVisible = useNavbarVisible();
  const isHydrated = useHydration();
  const [scrollIcon, setScrollIcon] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <>
      {/* Floating Scroll Button */}
      <div
        onClick={() =>
          isHydrated && window.scrollTo({ top: 0, behavior: "smooth" })
        }
        className={`w-14 h-14 flex justify-center items-center bg-background rounded-md shadow-xl cursor-pointer ${
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

      <Suspense
        fallback={
          <div className="w-full h-12 bg-background animate-pulse rounded-full" />
        }
      >
        <ClientInteractiveLayerContent
          categories={categories}
          placeTypeLabel={placeTypeLabel}
          isNavbarVisible={isNavbarVisible}
          isHydrated={isHydrated}
          scrollIcon={scrollIcon}
          isModalOpen={isModalOpen}
          handleOpenModal={handleOpenModal}
          handleCloseModal={handleCloseModal}
        />
      </Suspense>
    </>
  );
}

export default memo(ClientInteractiveLayer);
