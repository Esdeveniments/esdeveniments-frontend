"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import { sendGoogleEvent } from "@utils/analytics";
import {
  SearchIcon,
  ChevronDownIcon,
  XIcon,
} from "@heroicons/react/solid";
import { startNavigationFeedback } from "@lib/navigation-feedback";
import { generateRegionsAndTownsOptions } from "@utils/helpers";
import { SelectSkeleton } from "@components/ui/common/skeletons";
import { Option } from "types/common";
import { useHero } from "./HeroContext";
import { buildHeroUrl } from "./utils";

const Modal = dynamic(() => import("@components/ui/common/modal"), {
  loading: () => <></>,
  ssr: false,
});

const Select = dynamic(() => import("@components/ui/common/form/select"), {
  loading: () => <SelectSkeleton />,
  ssr: false,
});

export default function HeroSearch({ subTitle }: { subTitle?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { place, label, setPlace, searchTerm, setSearchTerm, date } = useHero();

  // --- Location Logic ---
  const {
    regionsWithCities,
    isLoading: loadingRegions,
    isError: regionsError,
  } = useGetRegionsWithCities();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localPlace, setLocalPlace] = useState<Option | null>(null);

  const regionsAndCitiesArray = useMemo(() => {
    if (!regionsWithCities) return [];
    return generateRegionsAndTownsOptions(regionsWithCities);
  }, [regionsWithCities]);

  const isLoadingRegions =
    loadingRegions ||
    (!regionsWithCities && !regionsError);

  const allLocations = useMemo(() => {
    return regionsAndCitiesArray.flatMap((group) => group.options);
  }, [regionsAndCitiesArray]);

  useEffect(() => {
    const segment = pathname?.split("/")[1];
    if (segment && segment !== "catalunya") {
      const match = allLocations.find((loc) => loc.value === segment);
      if (match) {
        setPlace(match.value, match.label);
        return;
      }
    }
    // If we are at root, ensure it's catalunya
    if (pathname === "/" || pathname === "/catalunya") {
      setPlace("catalunya", "Catalunya");
    }
  }, [pathname, allLocations, setPlace]);

  // Sync initial search term from URL
  const urlSearchTerm = searchParams?.get("search") || "";
  useEffect(() => {
    if (urlSearchTerm) {
      setSearchTerm(urlSearchTerm);
    }
  }, [urlSearchTerm, setSearchTerm]);

  const handleApplyLocation = useCallback(() => {
    if (localPlace) {
      setPlace(localPlace.value, localPlace.label);

      sendGoogleEvent("location_selected", {
        category: "hero_search",
        label: localPlace.label,
        value: localPlace.value,
      });
    } else {
      // If cleared or null, maybe default to Catalunya? 
      // The original logic didn't seem to have a clear "clear" action other than selecting something else.
      // But let's assume if they clear it, it goes to Catalunya.
      setPlace("catalunya", "Catalunya");
    }
    setIsModalOpen(false);
  }, [localPlace, setPlace]);

  const handlePlaceChange = useCallback((option: Option | null) => {
    setLocalPlace(option);
  }, []);

  // --- Search Logic ---

  const handleSearchSubmit = useCallback(() => {
    const value = searchTerm.trim();

    sendGoogleEvent("search", {
      category: "hero_search",
      label: value,
      search_term: value,
      value: value,
    });

    const url = buildHeroUrl(place, date, value);

    startNavigationFeedback();
    router.push(url);
  }, [searchTerm, place, date, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Title Section */}
      <div className="flex flex-col items-center justify-center text-center gap-2">
        <h1 className="heading-1 flex flex-wrap items-center justify-center gap-2">
          <span>Què fer a</span>
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => {
                const currentOption = regionsAndCitiesArray
                  .flatMap((group) => group.options)
                  .find((option) => option.value === place);
                setLocalPlace(currentOption || null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1 text-primary hover:underline decoration-2 underline-offset-4 transition-all"
              aria-expanded={isModalOpen}
            >
              {label}
              <ChevronDownIcon
                className={`h-8 w-8 transition-transform duration-200 ${isModalOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            <Modal
              open={isModalOpen}
              setOpen={setIsModalOpen}
              title="Selecciona població"
              actionButton="Seleccionar"
              onActionButtonClick={async () => handleApplyLocation()}
              testId="location-modal"
            >
              <div className="w-full flex flex-col justify-start items-start gap-4 py-4">
                <div className="w-full flex flex-col px-0">
                  {isLoadingRegions ? (
                    <SelectSkeleton />
                  ) : (
                    <Select
                      id="hero-location-select"
                      title=""
                      options={regionsAndCitiesArray}
                      value={localPlace}
                      onChange={handlePlaceChange}
                      isClearable
                      placeholder="Cercar població o comarca..."
                      testId="hero-location-select"
                      autoFocus
                    />
                  )}
                </div>
              </div>
            </Modal>
          </div>
        </h1>
        <p className="body-large text-foreground/70 max-w-xl mx-auto">
          {subTitle || "Agenda cultural, festes majors i activitats"}
        </p>
      </div>

      {/* Search Bar */}
      <div className="w-full max-w-2xl mx-auto relative">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-foreground/40 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            className="w-full pl-11 pr-12 py-3 bg-background border border-border rounded-full shadow-sm hover:shadow-md focus:shadow-md focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-base placeholder:text-foreground/40"
            placeholder={`Cerca esdeveniments a ${label}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid="search-input"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
              }}
              className="absolute inset-y-0 right-12 flex items-center px-2 text-foreground/40 hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleSearchSubmit}
            className="absolute inset-y-1 right-1 px-4 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors flex items-center justify-center"
            data-testid="search-button"
          >
            <SearchIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
