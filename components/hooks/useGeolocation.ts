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
        setError("La geolocalització no està disponible en aquest navegador.");
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
                  "Permisos de localització denegats. Activa la localització al navegador per utilitzar aquesta funció.";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage =
                  "Localització no disponible. Prova a seleccionar una població en lloc d'utilitzar la distància.";
                break;
              case error.TIMEOUT:
                errorMessage =
                  "Temps d'espera esgotat. Prova de nou o selecciona una població.";
                break;
              default:
                errorMessage =
                  "Error obtenint la localització. Prova a seleccionar una població en lloc d'utilitzar la distància.";
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
