"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
// import { useGeolocation } from "@components/hooks/useGeolocation";
import { LocationDiscoveryWidgetProps } from "types/props";
import { sendGoogleEvent } from "@utils/analytics";
import {
  SearchIcon,
  LocationMarkerIcon,
  ChevronDownIcon,
} from "@heroicons/react/solid";
import { GlobeAltIcon as GlobeIcon } from "@heroicons/react/outline";
import { transformRegionsToOptions } from "./utils";

export default function LocationDiscoveryWidget({
  className = "",
  onLocationChange,
}: LocationDiscoveryWidgetProps) {
  const router = useRouter();
  const {
    regionsWithCities,
    isLoading: loadingRegions,
    isError,
  } = useGetRegionsWithCities();
  // const {
  //   isLoading: isGettingLocation,
  //   error: locationError,
  //   requestLocation,
  // } = useGeolocation();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentLocation, setCurrentLocation] = useState("Catalunya");

  // Transform regions to options with memoization
  const allLocations = useMemo(() => {
    return regionsWithCities
      ? transformRegionsToOptions(regionsWithCities)
      : [];
  }, [regionsWithCities]);

  // Filter locations based on search term
  const filteredLocations = allLocations.filter((location) =>
    location.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    router.push("/catalunya");
  }, [router]);

  if (isError) {
    console.error("Failed to load regions data");
  }

  return (
    <div
      className={`w-full bg-background flex justify-center items-center pt-element-gap ${className}`}
    >
      <div className="container flex flex-col justify-center items-center">
        <div className="relative w-full">
          {/* Main Location Selector */}
          <div className="flex items-center gap-element-gap mb-element-gap">
            <GlobeIcon className="w-4 h-4" />
            <h2 className="body-small text-foreground">
              Mirant esdeveniments a
            </h2>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center border border-border rounded-input px-button-x py-button-y bg-background hover:border-primary transition-colors duration-200 focus-ring"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                data-testid="location-toggle-button"
              >
                <div className="flex items-center gap-2">
                  <LocationMarkerIcon className="h-5 w-5 text-primary" />
                  <span className="text-foreground-strong">
                    {currentLocation || "Selecciona ubicació"}
                  </span>
                </div>
                <ChevronDownIcon
                  className={`h-5 w-5 text-foreground-strong transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="absolute top-full left-0 mt-1 bg-background border border-border border-opacity-50 rounded-lg shadow-lg z-50 max-h-64 overflow-hidden min-w-[300px] w-max">
                  {/* Search input */}
                  <div className="p-input-x border-b border-border border-opacity-30">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60 w-4 h-4" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Cercar ubicació..."
                        className="input pl-9 body-small"
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
                      Descobrir altres esdeveniments
                    </span>
                  </button>

                  {/* Options list */}
                  <div className="max-h-48 overflow-y-auto">
                    {loadingRegions ? (
                      <div className="px-4 py-3 body-small text-foreground-strong/70 flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                        <span>Carregant ubicacions...</span>
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
                        No hi ha resultats
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
