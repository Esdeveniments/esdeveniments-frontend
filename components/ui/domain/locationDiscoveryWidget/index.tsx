"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
// import { useGeolocation } from "@components/hooks/useGeolocation";
import { LocationDiscoveryWidgetProps } from "types/props";
import { sendGoogleEvent } from "@utils/analytics";
import SearchIcon from "@heroicons/react/solid/SearchIcon";
import LocationMarkerIcon from "@heroicons/react/solid/LocationMarkerIcon";
import ChevronDownIcon from "@heroicons/react/solid/ChevronDownIcon";
import { GlobeAltIcon as GlobeIcon } from "@heroicons/react/outline";
import { transformRegionsToOptions } from "./utils";
import { Text } from "@components/ui/primitives/Text";

export default function LocationDiscoveryWidget({
  className = "",
  onLocationChange,
}: LocationDiscoveryWidgetProps) {
  const router = useRouter();
  const { regionsWithCities, isLoading, isError } = useGetRegionsWithCities();
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
    location.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Handle location selection
  const handleLocationSelect = useCallback(
    (locationName: string) => {
      setCurrentLocation(locationName);
      setIsOpen(false);
      setSearchTerm("");

      // Find the location option to get the correct URL value
      const locationOption = allLocations.find(
        (loc) => loc.label === locationName,
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
    [allLocations, onLocationChange, router],
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

  const handleOtherEvents = useCallback(() => {
    router.push("/catalunya");
  }, [router]);

  if (isError) {
    console.error("Failed to load regions data");
  }

  return (
    <div
      className={`flex w-full items-center justify-center bg-whiteCorp pt-component-xl ${className}`}
    >
      <div className="flex w-full flex-col items-center justify-center px-component-xs sm:w-[580px] md:w-[768px] lg:w-[1024px] lg:px-xs">
        <div className="relative w-full">
          {/* Main Location Selector */}
          <div className="mb-component-lg flex items-center space-x-2">
            <GlobeIcon className="h-4 w-4" />
            <Text as="h2" variant="h2" className="text-foreground font-medium">
              Mirant esdeveniments a
            </Text>
            <div className="relative">
              <button
                className="group flex items-center space-x-2"
                onClick={() => setIsOpen(!isOpen)}
              >
                <ChevronDownIcon
                  className={`h-5 w-5 text-primary transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
                <Text
                  variant="body-lg"
                  className="border-b border-bColor pb-xs.5 font-normal text-bColor"
                >
                  {currentLocation}
                </Text>
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div
                  className="absolute left-1/2 top-8 z-20 w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2 transform rounded-xl border border-bColor/50 bg-whiteCorp py-component-sm opacity-100 shadow-xl sm:left-0 sm:transform-none"
                  style={{ backgroundColor: "rgb(255, 255, 255)" }}
                >
                  {/* Search Input */}
                  <div className="border-b border-bColor/50 px-component-md py-component-sm">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-blackCorp/40" />
                      <input
                        type="text"
                        placeholder="Cercar ubicació..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="py-component-xs.5 w-full rounded-lg border border-bColor/50 bg-whiteCorp pl-2xl pr-component-md focus:bg-whiteCorp"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Special Options */}
                  {/* <button
                    className="w-full flex items-center space-x-3 px-component-md py-component-sm hover:bg-primary/10 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleCurrentLocation}
                    disabled={isGettingLocation}
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      {isGettingLocation ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center group-hover:border-blue-600 transition-colors">
                          <div className="w-2 h-2 bg-primary rounded-full group-hover:bg-blue-600 transition-colors"></div>
                        </div>
                      )}
                    </div>
                    <Text variant="body" className="text-blackCorp  group-hover:text-blue-600 transition-colors font-medium">
                      {isGettingLocation
                        ? "Obtenint ubicació..."
                        : "Usar la meva ubicació actual"}
                    </Text>
                  </button> */}

                  {/* Error message */}
                  {/* {locationError && (
                    <Text
                      as="div"
                      variant="body-sm"
                      className="px-component-md py-component-xs text-error/80 bg-error/10 mx-component-md rounded-md"
                    >
                      {locationError}
                    </Text>
                  )} */}

                  <button
                    className="group flex w-full items-center space-x-3 border-b border-bColor/50 px-component-md py-component-sm transition-all duration-200 hover:bg-primary/10"
                    onClick={handleOtherEvents}
                  >
                    <div className="flex h-6 w-6 items-center justify-center">
                      <div className="group-hover:border-blue-600 flex h-5 w-5 items-center justify-center rounded border-2 border-primary transition-colors">
                        <div className="group-hover:bg-blue-600 h-1 w-2 rounded-sm bg-primary transition-colors"></div>
                      </div>
                    </div>
                    <Text
                      variant="body"
                      className="group-hover:text-blue-600 font-medium text-blackCorp transition-colors"
                    >
                      Descobrir altres esdeveniments
                    </Text>
                  </button>

                  {/* Location List */}
                  <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent max-h-64 overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center space-x-2 px-component-md py-component-sm">
                        <div className="border-t-transparent h-4 w-4 animate-spin rounded-full border-2 border-primary"></div>
                        <Text variant="body-sm" color="muted">
                          Carregant ubicacions...
                        </Text>
                      </div>
                    ) : filteredLocations.length > 0 ? (
                      filteredLocations.map((location) => (
                        <button
                          key={location.value}
                          className="group flex w-full items-center space-x-3 px-component-md py-component-sm text-left transition-all duration-200 hover:bg-primary/10"
                          onClick={() => handleLocationSelect(location.label)}
                        >
                          <div className="flex h-6 w-6 items-center justify-center">
                            <LocationMarkerIcon className="group-hover:text-blue-600 h-4 w-4 text-blackCorp/40 transition-colors" />
                          </div>
                          <Text
                            variant="body"
                            className="group-hover:text-blue-600 text-blackCorp transition-colors"
                          >
                            {location.label}
                          </Text>
                        </button>
                      ))
                    ) : (
                      <Text
                        as="p"
                        variant="body-sm"
                        className="px-component-md py-component-sm text-center text-blackCorp/60"
                      >
                        No s'han trobat ubicacions
                      </Text>
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
