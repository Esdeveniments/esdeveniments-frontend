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

  const handleOtherEvents = useCallback(() => {
    router.push("/catalunya");
  }, [router]);

  if (isError) {
    console.error("Failed to load regions data");
  }

  return (
    <div
      className={`w-full bg-whiteCorp flex justify-center items-center pt-8 ${className}`}
    >
      <div className="w-full flex flex-col justify-center items-center px-2 lg:px-0 sm:w-[580px] md:w-[768px] lg:w-[1024px]">
        <div className="relative w-full">
          {/* Main Location Selector */}
          <div className="flex items-center space-x-2 mb-6">
            <GlobeIcon className="w-4 h-4" />
            <h2 className="text-lg font-medium text-foreground">
              Mirant esdeveniments a
            </h2>
            <div className="relative">
              <button
                className="flex items-center space-x-2 group"
                onClick={() => setIsOpen(!isOpen)}
              >
                <ChevronDownIcon
                  className={`w-5 h-5 text-primary transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
                <span className="text-bColor text-lg font-normal border-b border-bColor pb-0.5">
                  {currentLocation}
                </span>
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div
                  className="absolute top-8 left-1/2 transform -translate-x-1/2 sm:left-0 sm:transform-none w-80 max-w-[calc(100vw-2rem)] bg-whiteCorp opacity-100 rounded-xl shadow-xl border border-border py-3 z-20"
                  style={{ backgroundColor: "rgb(255, 255, 255)" }}
                >
                  {/* Search Input */}
                  <div className="px-4 py-3 border-b border-border/30">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/60 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Cercar ubicació..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-lg bg-muted focus:bg-whiteCorp"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Special Options */}
                  {/* <button
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-blue-50 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <span className="text-foreground text-base group-hover:text-blue-600 transition-colors font-medium">
                      {isGettingLocation
                        ? "Obtenint ubicació..."
                        : "Usar la meva ubicació actual"}
                    </span>
                  </button> */}

                  {/* Error message */}
                  {/* {locationError && (
                    <div className="px-4 py-2 text-red-500 text-sm bg-red-50 mx-4 rounded-md">
                      {locationError}
                    </div>
                  )} */}

                  <button
                    className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-blue-50 transition-all duration-200 border-b border-border/30 group"
                    onClick={handleOtherEvents}
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-primary rounded flex items-center justify-center group-hover:border-blue-600 transition-colors">
                        <div className="w-2 h-1 bg-primary rounded-sm group-hover:bg-blue-600 transition-colors"></div>
                      </div>
                    </div>
                    <span className="text-foreground text-base group-hover:text-blue-600 transition-colors font-medium">
                      Descobrir altres esdeveniments
                    </span>
                  </button>

                  {/* Location List */}
                  <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    {isLoading ? (
                      <div className="px-4 py-3 text-foreground/70 text-sm flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                        <span>Carregant ubicacions...</span>
                      </div>
                    ) : filteredLocations.length > 0 ? (
                      filteredLocations.map((location) => (
                        <button
                          key={location.value}
                          className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-blue-50 transition-all duration-200 text-left group"
                          onClick={() => handleLocationSelect(location.label)}
                        >
                          <div className="w-6 h-6 flex items-center justify-center">
                            <LocationMarkerIcon className="w-4 h-4 text-foreground/60 group-hover:text-blue-600 transition-colors" />
                          </div>
                          <span className="text-foreground text-base group-hover:text-blue-600 transition-colors">
                            {location.label}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-foreground/70 text-sm text-center">
                        No s&apos;han trobat ubicacions
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
