"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "../../../i18n/routing";
import { useTranslations } from "next-intl";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
// import { useGeolocation } from "@components/hooks/useGeolocation";
import { LocationDiscoveryWidgetProps } from "types/props";
import { sendGoogleEvent } from "@utils/analytics";
import SearchIcon from "@heroicons/react/solid/esm/SearchIcon";
import LocationMarkerIcon from "@heroicons/react/solid/esm/LocationMarkerIcon";
import ChevronDownIcon from "@heroicons/react/solid/esm/ChevronDownIcon";
import GlobeAltIcon from "@heroicons/react/outline/esm/GlobeAltIcon";
const GlobeIcon = GlobeAltIcon;
import { transformRegionsToOptions } from "./utils";
import { normalizeForSearch } from "@utils/string-helpers";
import { startNavigationFeedback } from "@lib/navigation-feedback";

export default function LocationDiscoveryWidget({
  className = "",
  onLocationChange,
}: LocationDiscoveryWidgetProps) {
  const t = useTranslations("Components.LocationDiscovery");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentLocation, setCurrentLocation] = useState("Catalunya");

  const {
    regionsWithCities,
    isLoading: loadingRegions,
    isError,
  } = useGetRegionsWithCities(hasOpened);

  // Transform regions to options with memoization
  const allLocations = useMemo(() => {
    return regionsWithCities
      ? transformRegionsToOptions(regionsWithCities)
      : [];
  }, [regionsWithCities]);

  // Filter locations based on search term (accent-insensitive)
  const filteredLocations = useMemo(() => {
    if (!searchTerm) return allLocations;
    const normalizedSearch = normalizeForSearch(searchTerm);
    return allLocations.filter((location) =>
      normalizeForSearch(location.label).includes(normalizedSearch)
    );
  }, [allLocations, searchTerm]);

  // Handle location selection
  const handleLocationSelect = useCallback(
    (locationName: string) => {
      setCurrentLocation(locationName);
      setIsOpen(false);
      setSearchTerm("");

      // Find the location option to get the correct URL value
      const locationOption = allLocations.find(
        (loc) => loc.label === locationName
      );

      if (onLocationChange && locationOption) {
        onLocationChange(locationOption);
      }

      // Send analytics event
      sendGoogleEvent("location_selected", {
        category: "location_discovery",
        label: locationName,
        value: locationOption?.value || locationName.toLowerCase(),
      });

      // Navigate to location using the correct URL value
      const urlValue = locationOption?.value || "catalunya";
      startNavigationFeedback();
      router.push(`/${urlValue}`);
    },
    [allLocations, onLocationChange, router]
  );

  // Handle current location
  // const handleCurrentLocation = useCallback(async () => {
  //   if (!regionsWithCities) {
  //     console.error("Regions data not available");
  //     return;
  //   }

  //   try {
  //     const nearestCity = await requestLocation(regionsWithCities);

  //     if (nearestCity) {
  //       setCurrentLocation(nearestCity.label);
  //       setIsOpen(false);

  //       if (onLocationChange) {
  //         onLocationChange(nearestCity);
  //       }

  //       // Send analytics event
  //       sendGoogleEvent("location_selected", {
  //         category: "location_discovery",
  //         label: nearestCity.label,
  //         value: nearestCity.value,
  //       });

  //       // Navigate to location
  //       router.push(`/${nearestCity.value}`);
  //     } else {
  //       // If we couldn't find nearest city, just set as current location
  //       setCurrentLocation("La meva ubicació actual");
  //       setIsOpen(false);

  //       // Send analytics event
  //       sendGoogleEvent("location_selected", {
  //         category: "location_discovery",
  //         label: "La meva ubicació actual",
  //         value: "current_location",
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error getting current location:", error);
  //   }
  // }, [regionsWithCities, requestLocation, onLocationChange, router]);

  const onDiscoverOtherEvents = useCallback(() => {
    //
    startNavigationFeedback();
    router.push("/catalunya");
  }, [router]);

  if (isError) {
    console.error("Failed to load regions data");
  }

  return (
    <div
      className={`w-full bg-background flex justify-center items-center pt-section-y ${className}`}
    >
      <div className="flex flex-col justify-center items-center w-full">
        <div className="relative w-full">
          {/* Main Location Selector */}
          <div className="flex items-center gap-element-gap mb-element-gap flex-wrap md:flex-nowrap">
            <GlobeIcon className="w-4 h-4" />
            <h3 className="heading-3 text-foreground">
              {t("heading")}
            </h3>
            <div className="relative w-full md:w-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(!isOpen);
                  if (!isOpen) setHasOpened(true);
                }}
                className="w-full flex justify-between items-center border border-border rounded-input px-button-x py-button-y bg-background hover:border-primary transition-colors duration-200 focus-ring"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                data-testid="location-toggle-button"
              >
                <div className="flex items-center gap-2">
                  <LocationMarkerIcon className="h-5 w-5 text-primary" />
                  <span className="text-foreground-strong">
                    {currentLocation || t("selectLocation")}
                  </span>
                </div>
                <ChevronDownIcon
                  className={`h-5 w-5 text-foreground-strong transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {isOpen && (
                <div className="absolute top-full left-0 right-0 md:right-auto mt-1 bg-background border border-border border-opacity-50 rounded-lg shadow-lg z-50 max-h-64 overflow-hidden w-full md:w-max md:min-w-[300px] md:max-w-md">
                  {/* Search input */}
                  <div className="p-input-x border-b border-border border-opacity-30">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60 w-4 h-4" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t("searchPlaceholder")}
                        className="input pl-9 text-base"
                        inputMode="search"
                        autoFocus
                        data-testid="location-search-input"
                      />
                    </div>
                  </div>

                  {/* Discover other events */}
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-button-x py-button-y border-b border-border border-opacity-30 hover:bg-muted transition-colors duration-200 group focus-ring"
                    onClick={onDiscoverOtherEvents}
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-primary rounded flex items-center justify-center group-hover:border-primary/80 transition-colors">
                        <div className="w-2 h-1 bg-primary rounded-sm group-hover:bg-primary/80 transition-colors" />
                      </div>
                    </div>
                    <span className="text-foreground-strong body-small font-medium group-hover:opacity-90">
                      {t("discover")}
                    </span>
                  </button>

                  {/* Options list */}
                  <div className="max-h-48 overflow-y-auto">
                    {loadingRegions ? (
                      <div
                        className="px-4 py-3 body-small text-foreground-strong/70 flex items-center gap-2"
                        data-testid="location-loading"
                      >
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                        <span>{t("loading")}</span>
                      </div>
                    ) : filteredLocations.length > 0 ? (
                      <ul role="listbox">
                        {filteredLocations.map((location) => (
                          <li
                            key={location.value}
                            role="option"
                            aria-selected={currentLocation === location.label}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleLocationSelect(location.label)
                              }
                              className="w-full px-input-x py-input-y hover:bg-muted cursor-pointer body-small text-foreground-strong flex items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                              <LocationMarkerIcon className="h-4 w-4 text-foreground/60 flex-shrink-0" />
                              {location.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-center body-small text-foreground-strong/70">
                        {t("noResults")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Click outside to close */}
          {isOpen && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
