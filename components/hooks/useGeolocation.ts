"use client";
import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Option } from "types/common";
import { UseGeolocationReturn } from "types/props";
import { findNearestCity } from "../../components/ui/locationDiscoveryWidget/utils";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

export function useGeolocation(): UseGeolocationReturn {
  const t = useTranslations("Components.FiltersModal.geo");
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(
    async (
      regions: RegionsGroupedByCitiesResponseDTO[]
    ): Promise<Option | null> => {
      if (!("geolocation" in navigator)) {
        setError(t("unsupported"));
        return null;
      }

      setIsLoading(true);
      setError(null);

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position: GeolocationPosition) => {
            const coords = position.coords;
            setLocation(coords);
            setIsLoading(false);

            // Find nearest city based on coordinates
            const nearestCity = findNearestCity(coords, regions);
            resolve(nearestCity);
          },
          (error: GeolocationPositionError) => {
            let errorMessage: string;
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = t("permissionDenied");
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = t("positionUnavailable");
                break;
              case error.TIMEOUT:
                errorMessage = t("timeout");
                break;
              default:
                errorMessage = t("genericError");
            }

            setError(errorMessage);
            setIsLoading(false);
            resolve(null);
          }
        );
      });
    },
    [t]
  );

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return {
    location,
    isLoading,
    error,
    requestLocation,
    clearLocation,
  };
}
