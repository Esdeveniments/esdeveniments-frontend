import { useState, useCallback } from "react";
import { Option } from "types/common";
import { UseGeolocationReturn } from "types/props";
import { findNearestCity } from "../../components/ui/locationDiscoveryWidget/utils";
import { RegionsGroupedByCitiesResponseDTO } from "types/api/region";

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(
    async (
      regions: RegionsGroupedByCitiesResponseDTO[]
    ): Promise<Option | null> => {
      if (!("geolocation" in navigator)) {
        setError("Geolocation is not supported by this browser.");
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
                errorMessage =
                  "Permission denied. The user has denied the request for geolocation.";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage =
                  "Position unavailable. Location information is unavailable.";
                break;
              case error.TIMEOUT:
                errorMessage =
                  "Timeout. The request to get user location timed out.";
                break;
              default:
                errorMessage = "An unknown error occurred.";
            }

            setError(errorMessage);
            setIsLoading(false);
            resolve(null);
          }
        );
      });
    },
    []
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
