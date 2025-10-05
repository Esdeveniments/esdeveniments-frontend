"use client";

import { memo, useEffect, useState, Suspense } from "react";
import NextImage from "next/image";
import { useScrollVisibility } from "@components/hooks/useScrollVisibility";
import { useHydration } from "@components/hooks/useHydration";
import { useSearchParams, usePathname } from "next/navigation"; // Added usePathname
import Search from "components/ui/domain/search";
import Filters from "@components/ui/domain/Filters";
import { parseFiltersFromUrl } from "@utils/url-filters";
import { extractURLSegments, debugURLParsing } from "@utils/url-parsing";
import { ClientInteractiveLayerProps } from "types/props";
import Imago from "public/static/images/imago-esdeveniments.png";

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
  const [userLocation, setUserLocation] = useState<
    { latitude: number; longitude: number } | undefined
  >();
  const searchParams = useSearchParams();
  const pathname = usePathname(); // Get current pathname

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
    categories, // Pass dynamic categories for proper validation
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
        className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-md bg-whiteCorp shadow-xl ${
          isHydrated && scrollIcon
            ? "fixed bottom-28 right-10 z-10 flex animate-appear justify-end"
            : "hidden"
        }`}
      >
        <NextImage
          src={Imago}
          className="p-component-xs"
          width={28}
          height={28}
          alt="Esdeveniments.cat"
        />
      </div>

      {/* Fixed Search and Filters Bar */}
      <div
        className={`fixed w-full bg-whiteCorp transition-all duration-500 ease-in-out ${stickyClasses} flex items-center justify-center pt-component-xs`}
      >
        <div className="mx-auto flex w-full flex-col items-center justify-center px-component-xs pb-component-xs pt-component-xs sm:w-[580px] md:w-[768px] md:items-start lg:w-[1024px]">
          <Suspense
            fallback={
              <div className="h-12 w-full animate-pulse rounded-full bg-whiteCorp" />
            }
          >
            <Search />
          </Suspense>
          {!isHomePage && ( // Conditionally render Filters
            <Filters
              segments={parsed.segments}
              queryParams={parsed.queryParams}
              categories={categories}
              placeTypeLabel={placeTypeLabel}
              userLocation={userLocation}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default memo(ClientInteractiveLayer);
