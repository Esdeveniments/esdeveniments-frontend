"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import { sendGoogleEvent } from "@utils/analytics";
import {
  SearchIcon,
  LocationMarkerIcon,
  ChevronDownIcon,
  XIcon,
} from "@heroicons/react/solid";
import { normalizeForSearch } from "@utils/string-helpers";
import { startNavigationFeedback } from "@lib/navigation-feedback";
import { transformRegionsToOptions } from "@components/ui/locationDiscoveryWidget/utils";
import { useHero } from "./HeroContext";
import { buildHeroUrl } from "./utils";

export default function HeroSearch({ subTitle }: { subTitle?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { place, label, setPlace, searchTerm, setSearchTerm, date } = useHero();

  // --- Location Logic ---
  const {
    regionsWithCities,
    isLoading: loadingRegions,
  } = useGetRegionsWithCities();

  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [locationSearchTerm, setLocationSearchTerm] = useState("");

  const allLocations = useMemo(() => {
    return regionsWithCities
      ? transformRegionsToOptions(regionsWithCities)
      : [];
  }, [regionsWithCities]);

  const filteredLocations = useMemo(() => {
    if (!locationSearchTerm) return allLocations;
    const normalizedSearch = normalizeForSearch(locationSearchTerm);
    return allLocations.filter((location) =>
      normalizeForSearch(location.label).includes(normalizedSearch)
    );
  }, [allLocations, locationSearchTerm]);

  // Sync initial location from URL if not already set (or if we want to keep it in sync)
  // But for "Draft Mode", we only want to sync ONCE on mount or path change,
  // and then let the user modify it locally.
  // Actually, if the user navigates back/forward, we want to update.
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

  const handleLocationSelect = useCallback(
    (locationName: string, locationValue: string) => {
      setPlace(locationValue, locationName);
      setIsLocationOpen(false);
      setLocationSearchTerm("");

      sendGoogleEvent("location_selected", {
        category: "hero_search",
        label: locationName,
        value: locationValue,
      });
      
      // DO NOT Navigate immediately. 
      // User is "constructing" the query.
    },
    [setPlace]
  );

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
              onClick={() => setIsLocationOpen(!isLocationOpen)}
              className="flex items-center gap-1 text-primary hover:underline decoration-2 underline-offset-4 transition-all"
              aria-expanded={isLocationOpen}
            >
              {label}
              <ChevronDownIcon
                className={`h-8 w-8 transition-transform duration-200 ${
                  isLocationOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Location Dropdown */}
            {isLocationOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                  onClick={() => setIsLocationOpen(false)}
                />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[300px] sm:w-[400px] bg-background border border-border rounded-lg shadow-xl z-50 overflow-hidden text-left">
                  <div className="p-3 border-b border-border">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 w-4 h-4" />
                      <input
                        type="text"
                        value={locationSearchTerm}
                        onChange={(e) => setLocationSearchTerm(e.target.value)}
                        placeholder="Cercar població o comarca..."
                        className="w-full pl-9 pr-4 py-2 bg-muted/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {loadingRegions ? (
                      <div className="p-4 text-center text-sm text-foreground/60">
                        Carregant...
                      </div>
                    ) : filteredLocations.length > 0 ? (
                      <ul className="py-1">
                        {filteredLocations.map((loc) => (
                          <li key={loc.value}>
                            <button
                              type="button"
                              onClick={() =>
                                handleLocationSelect(loc.label, loc.value)
                              }
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 ${
                                label === loc.label
                                  ? "text-primary font-medium bg-primary/5"
                                  : "text-foreground"
                              }`}
                            >
                              <LocationMarkerIcon className="w-4 h-4 opacity-50" />
                              {loc.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-sm text-foreground/60">
                        No s&apos;han trobat resultats
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
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
