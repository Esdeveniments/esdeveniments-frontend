import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  memo,
  ChangeEvent,
  FC,
} from "react";
import { useRouter } from "next/navigation";
import { RadioInput, RangeInput, Text } from "@components/ui/primitives";
import { BYDATES, DISTANCES } from "@utils/constants";
import { sendEventToGA, generateRegionsAndTownsOptions } from "@utils/helpers";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import type { Option } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import {
  GeolocationPosition,
  GroupedOption,
  GeolocationError,
} from "types/common";
import { buildFilterUrl } from "@utils/url-filters";
import type { EventCategory } from "@store";
import { NavigationFiltersModalProps } from "types/props";

import { Modal } from "@components/ui/primitives";
import { Select } from "@components/ui/primitives";

const NavigationFiltersModal: FC<NavigationFiltersModalProps> = ({
  isOpen,
  onClose,
  currentSegments,
  currentQueryParams,
  userLocation: initialUserLocation,
  categories = [],
}) => {
  const [localPlace, setLocalPlace] = useState<string>("");
  const [localByDate, setLocalByDate] = useState<string>("");
  const [localCategory, setLocalCategory] = useState<string>("");
  const [localDistance, setLocalDistance] = useState<string>("");
  const [localUserLocation, setLocalUserLocation] =
    useState(initialUserLocation);
  const [userLocationLoading, setUserLocationLoading] =
    useState<boolean>(false);
  const [userLocationError, setUserLocationError] = useState<string>("");
  const [selectOption, setSelectOption] = useState<Option | null>(null);

  const { regionsWithCities, isLoading: isLoadingRegionsWithCities } =
    useGetRegionsWithCities();

  const regionsAndCitiesArray: GroupedOption[] = useMemo(() => {
    if (!regionsWithCities) return [];
    return generateRegionsAndTownsOptions(regionsWithCities);
  }, [regionsWithCities]);

  useEffect(() => {
    if (isOpen) {
      const place =
        currentSegments.place === "catalunya" ? "" : currentSegments.place;

      const byDate = currentSegments.date;

      const category =
        currentSegments.category === "tots" ? "" : currentSegments.category;

      // Infer distance from URL: if lat/lon exist but no distance, assume default 50
      const distance =
        currentQueryParams.distance ||
        (currentQueryParams.lat && currentQueryParams.lon ? "50" : "");

      setLocalPlace(place);
      setLocalByDate(byDate);
      setLocalCategory(category);
      setLocalDistance(distance);
      setLocalUserLocation(initialUserLocation);

      const regionOption = regionsAndCitiesArray
        .flatMap((group) => group.options)
        .find((option) => option.value === place);
      setSelectOption(regionOption || null);
    }
  }, [
    isOpen,
    currentSegments,
    currentQueryParams,
    initialUserLocation,
    regionsAndCitiesArray,
  ]);

  const router = useRouter();

  const handlePlaceChange = useCallback((option: Option | null) => {
    setSelectOption(option);
    setLocalPlace(option?.value || "");
  }, []);

  const handleUserLocation = useCallback(
    (value: string) => {
      if (localUserLocation) {
        setLocalDistance(value);
        return;
      }

      setUserLocationLoading(true);
      setUserLocationError("");

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position: GeolocationPosition) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };

            setLocalUserLocation(location);
            setUserLocationLoading(false);
            setLocalDistance(value);
          },
          (error: GeolocationError) => {
            setUserLocationLoading(false);

            switch (error.code) {
              case 1: // PERMISSION_DENIED
                setUserLocationError(
                  "Permisos de localització denegats. Activa la localització al navegador per utilitzar aquesta funció.",
                );
                break;
              case 2: // POSITION_UNAVAILABLE
                setUserLocationError(
                  "Localització no disponible. Prova a seleccionar una població en lloc d'utilitzar la distància.",
                );
                break;
              case 3: // TIMEOUT
                setUserLocationError(
                  "Temps d'espera esgotat. Prova de nou o selecciona una població.",
                );
                break;
              default:
                setUserLocationError(
                  "Error obtenint la localització. Prova a seleccionar una població en lloc d'utilitzar la distància.",
                );
            }
          },
          {
            enableHighAccuracy: false, // Don't require GPS, allow network location
            timeout: 10000, // 10 second timeout
            maximumAge: 300000, // Accept cached location up to 5 minutes old
          },
        );
      } else {
        console.log("Geolocation is not supported by this browser.");
        setUserLocationError(
          "La geolocalització no està disponible en aquest navegador.",
        );
        setUserLocationLoading(false);
      }
    },
    [localUserLocation],
  );

  const handleDistanceChange = useCallback(
    (
      event:
        | ChangeEvent<HTMLInputElement>
        | { target: { value: string | number } },
    ) => {
      handleUserLocation(event.target.value as string);
    },
    [handleUserLocation],
  );

  const applyFilters = () => {
    const hasDistance = localDistance && localDistance !== "";
    const hasUserLocation = Boolean(localUserLocation);

    const changes = {
      // Clear place when using distance filter with user location
      place:
        hasDistance && hasUserLocation
          ? "catalunya"
          : localPlace || "catalunya",
      byDate: localByDate || "avui",
      category: (localCategory || "tots") as EventCategory,
      searchTerm: currentQueryParams.search || "",
      distance: hasDistance ? parseInt(localDistance) : 50,
      // Only include lat/lon if we have both distance and user location
      lat:
        hasDistance && hasUserLocation && localUserLocation
          ? localUserLocation.latitude
          : undefined,
      lon:
        hasDistance && hasUserLocation && localUserLocation
          ? localUserLocation.longitude
          : undefined,
    };

    const newUrl = buildFilterUrl(currentSegments, currentQueryParams, changes);

    sendEventToGA("Place", changes.place);
    sendEventToGA("ByDate", changes.byDate);
    sendEventToGA("Category", changes.category);
    sendEventToGA("Distance", changes.distance.toString());

    router.push(newUrl);
    onClose();
  };

  const handleByDateChange = useCallback((value: string | number) => {
    setLocalByDate((prevValue) => (prevValue === value ? "" : value) as string);
  }, []);

  const handleCategoryChange = useCallback((value: string | number) => {
    setLocalCategory(
      (prevValue) => (prevValue === value ? "" : value) as string,
    );
  }, []);

  const disablePlace: boolean =
    localDistance !== undefined &&
    localDistance !== "" &&
    !Number.isNaN(Number(localDistance));

  // Allow distance interaction if coords exist in URL (for clearing) or if no place is selected
  const hasCoordinatesInUrl = Boolean(
    currentQueryParams.lat && currentQueryParams.lon,
  );
  const disableDistance: boolean =
    (Boolean(localPlace) && !hasCoordinatesInUrl) ||
    userLocationLoading ||
    Boolean(userLocationError);

  return (
    <Modal.Root
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
    >
      <Modal.Header title="Filtres" onClose={onClose} />
      <Modal.Body>
        <div className="gap-md flex h-full w-full flex-col items-start justify-start py-component-xl">
          <div className="flex w-full flex-col items-start justify-start gap-component-md">
            <Text
              as="p"
              variant="body"
              className="w-full pt-[4px] font-barlow font-semibold uppercase"
            >
              Poblacions
            </Text>
            <div className="px-xs flex w-full flex-col">
              <Select
                id="options"
                label="Poblacions"
                options={regionsAndCitiesArray}
                value={selectOption}
                onChange={handlePlaceChange}
                isClearable
                placeholder={
                  isLoadingRegionsWithCities
                    ? "Carregant poblacions..."
                    : "Selecciona població"
                }
                isDisabled={isLoadingRegionsWithCities || disablePlace}
              />
            </div>
          </div>
          <fieldset className="flex w-full flex-col items-start justify-start gap-component-md">
            <Text
              as="p"
              variant="body"
              className="w-full font-barlow font-semibold uppercase"
            >
              Categories
            </Text>
            <div className="grid w-full grid-cols-3 gap-x-4 gap-y-2">
              {categories.map((category: CategorySummaryResponseDTO) => (
                <RadioInput
                  key={category.id}
                  id={category.slug}
                  name="category"
                  value={category.slug}
                  checkedValue={localCategory}
                  onChange={handleCategoryChange}
                  label={category.name}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="flex w-full flex-col items-start justify-start gap-component-lg">
            <Text
              as="p"
              variant="body"
              className="w-full pt-[4px] font-barlow font-semibold uppercase"
            >
              Data
            </Text>
            <div className="flex w-full flex-col flex-wrap items-start justify-start gap-x-3 gap-y-3">
              {BYDATES.map(({ value, label }) => (
                <RadioInput
                  key={value}
                  id={value}
                  name="byDate"
                  value={value}
                  checkedValue={localByDate}
                  onChange={handleByDateChange}
                  label={label}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="flex w-full flex-col items-start justify-start gap-component-lg">
            <Text
              as="p"
              variant="body"
              className="w-full pt-[4px] font-barlow font-semibold uppercase"
            >
              Distància
            </Text>
            {(userLocationLoading || userLocationError) && (
              <div className="border-t border-bColor py-component-xs">
                <div className="flex flex-col">
                  {userLocationLoading && (
                    <Text variant="body-sm" color="muted">
                      Carregant localització...
                    </Text>
                  )}
                  {userLocationError && (
                    <Text variant="body-sm" color="primary">
                      {userLocationError}
                    </Text>
                  )}
                </div>
              </div>
            )}
            <div
              className={`gap-3px-0 flex w-full flex-col items-start justify-start ${
                disableDistance ? "opacity-30" : ""
              }`}
            >
              <RangeInput
                key="distance"
                id="distance"
                min={Number(DISTANCES[0])}
                max={Number(DISTANCES[DISTANCES.length - 1])}
                value={Number(localDistance) || 50}
                onChange={handleDistanceChange}
                label="Esdeveniments a"
                disabled={disableDistance}
              />
            </div>
          </fieldset>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex justify-center py-component-md">
          <button
            onClick={applyFilters}
            className="rounded-xl border border-whiteCorp bg-primary px-component-lg py-component-sm font-barlow font-semibold uppercase italic tracking-wide text-whiteCorp duration-300 ease-in-out focus:outline-none disabled:cursor-default disabled:opacity-50 disabled:hover:bg-primary"
          >
            Aplicar filtres
          </button>
        </div>
      </Modal.Footer>
    </Modal.Root>
  );
};

NavigationFiltersModal.displayName = "NavigationFiltersModal";

export default memo(NavigationFiltersModal);
