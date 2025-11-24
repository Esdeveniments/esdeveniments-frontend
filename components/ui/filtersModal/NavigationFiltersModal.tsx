import {
  useMemo,
  useState,
  useCallback,
  memo,
  ChangeEvent,
  FC,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import RadioInput from "@components/ui/common/form/radioInput";
import RangeInput from "@components/ui/common/form/rangeInput";
import { BYDATES, DISTANCES, DEFAULT_FILTER_VALUE } from "@utils/constants";
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
import { NavigationFiltersModalProps } from "types/props";
import { startNavigationFeedback } from "@lib/navigation-feedback";
import { SelectSkeleton } from "@components/ui/common/skeletons";
import { useFilterLoading } from "@components/context/FilterLoadingContext";

const Modal = dynamic(() => import("@components/ui/common/modal"), {
  loading: () => <></>,
  ssr: false,
});

const Select = dynamic(() => import("@components/ui/common/form/select"), {
  loading: () => <SelectSkeleton />,
  ssr: false,
});

const NavigationFiltersModal: FC<NavigationFiltersModalProps> = ({
  isOpen,
  onClose,
  currentSegments,
  currentQueryParams,
  userLocation: initialUserLocation,
  categories = [],
}) => {
  const {
    regionsWithCities,
    isLoading: isLoadingRegionsWithCities,
    isError: isErrorRegionsWithCities,
  } = useGetRegionsWithCities();

  const regionsAndCitiesArray: GroupedOption[] = useMemo(() => {
    if (!regionsWithCities) return [];
    return generateRegionsAndTownsOptions(regionsWithCities);
  }, [regionsWithCities]);

  const isLoadingRegions =
    isLoadingRegionsWithCities ||
    (!regionsWithCities && !isErrorRegionsWithCities);

  const defaults = useMemo(() => {
    const place =
      currentSegments.place === "catalunya" ? "" : currentSegments.place;
    const byDate = currentSegments.date;
    const category =
      currentSegments.category === DEFAULT_FILTER_VALUE
        ? ""
        : currentSegments.category;
    const distance =
      currentQueryParams.distance ||
      (currentQueryParams.lat && currentQueryParams.lon ? "50" : "");
    const regionOption = regionsAndCitiesArray
      .flatMap((group) => group.options)
      .find((option) => option.value === place);
    return {
      place,
      byDate,
      category,
      distance,
      userLocation: initialUserLocation,
      selectOption: regionOption || null,
    };
  }, [
    currentSegments,
    currentQueryParams,
    initialUserLocation,
    regionsAndCitiesArray,
  ]);

  const [localPlace, setLocalPlace] = useState<string>(defaults.place);
  const [localByDate, setLocalByDate] = useState<string>(defaults.byDate);
  const [localCategory, setLocalCategory] = useState<string>(defaults.category);
  const [localDistance, setLocalDistance] = useState<string>(defaults.distance);
  const [localUserLocation, setLocalUserLocation] = useState(
    defaults.userLocation
  );
  const [userLocationLoading, setUserLocationLoading] =
    useState<boolean>(false);
  const [userLocationError, setUserLocationError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const geolocationPromiseRef = useRef<Promise<
    { latitude: number; longitude: number } | undefined
  > | null>(null);

  // Reset local state whenever the modal opens or the default inputs change while open
  useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => {
      setLocalPlace(defaults.place);
      setLocalByDate(defaults.byDate);
      setLocalCategory(defaults.category);
      setLocalDistance(defaults.distance);
      setLocalUserLocation(defaults.userLocation);
      setUserLocationLoading(false);
      setUserLocationError("");
    }, 0);
    return () => window.clearTimeout(id);
  }, [
    isOpen,
    defaults.place,
    defaults.byDate,
    defaults.category,
    defaults.distance,
    defaults.userLocation,
  ]);

  const router = useRouter();
  const { setLoading } = useFilterLoading();

  const handlePlaceChange = useCallback((option: Option | null) => {
    setLocalPlace(option?.value || "");
  }, []);

  const triggerGeolocation = useCallback(async () => {
    if (localUserLocation) {
      return localUserLocation;
    }

    if (geolocationPromiseRef.current) {
      return geolocationPromiseRef.current;
    }

    if (userLocationLoading) {
      return undefined;
    }

    setUserLocationLoading(true);
    setUserLocationError("");

    geolocationPromiseRef.current = new Promise((resolve) => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position: GeolocationPosition) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };

            setLocalUserLocation(location);
            setUserLocationLoading(false);
            geolocationPromiseRef.current = null;
            resolve(location);
          },
          (error: GeolocationError) => {
            setUserLocationLoading(false);

            switch (error.code) {
              case 1: // PERMISSION_DENIED
                setUserLocationError(
                  "Permisos de localització denegats. Activa la localització al navegador per utilitzar aquesta funció."
                );
                break;
              case 2: // POSITION_UNAVAILABLE
                setUserLocationError(
                  "Localització no disponible. Prova a seleccionar una població en lloc d'utilitzar la distància."
                );
                break;
              case 3: // TIMEOUT
                setUserLocationError(
                  "Temps d'espera esgotat. Prova de nou o selecciona una població."
                );
                break;
              default:
                setUserLocationError(
                  "Error obtenint la localització. Prova a seleccionar una població en lloc d'utilitzar la distància."
                );
            }

            geolocationPromiseRef.current = null;
            resolve(undefined);
          },
          {
            enableHighAccuracy: false, // Don't require GPS, allow network location
            timeout: 10000, // 10 second timeout
            maximumAge: 300000, // Accept cached location up to 5 minutes old
          }
        );
      } else {
        console.log("Geolocation is not supported by this browser.");
        setUserLocationError(
          "La geolocalització no està disponible en aquest navegador."
        );
        setUserLocationLoading(false);
        geolocationPromiseRef.current = null;
        resolve(undefined);
      }
    });

    return geolocationPromiseRef.current;
  }, [localUserLocation, userLocationLoading]);

  const handleUserLocation = useCallback(
    (value: string) => {
      // Always update the visual value immediately
      setLocalDistance(value);

      // If dragging, don't trigger geolocation yet
      if (isDragging) {
        return;
      }

      // Not dragging, proceed with geolocation if needed
      void triggerGeolocation();
    },
    [isDragging, triggerGeolocation]
  );

  const handleDistanceChange = useCallback(
    (
      event:
        | ChangeEvent<HTMLInputElement>
        | { target: { value: string | number } }
    ) => {
      handleUserLocation(event.target.value as string);
    },
    [handleUserLocation]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    // Trigger geolocation directly (bypassing state check since we just set isDragging to false)
    if (!localUserLocation && !userLocationLoading && localDistance) {
      void triggerGeolocation();
    }
  }, [
    localUserLocation,
    userLocationLoading,
    localDistance,
    triggerGeolocation,
  ]);

  const applyFilters = async () => {
    const hasDistance = localDistance && localDistance !== "";
    let location = localUserLocation;

    // If distance is set but we don't yet have a location, request it before applying
    if (hasDistance && !location && !userLocationError) {
      location = await triggerGeolocation();
      // If geolocation failed, location will be undefined. Stop here to let user see the error.
      if (!location) {
        return;
      }
    }

    const hasUserLocation = Boolean(location);
    const isDistanceFilterActive = hasDistance && hasUserLocation && location;

    const changes = {
      // Clear place when using distance filter with user location
      place: isDistanceFilterActive ? "catalunya" : localPlace || "catalunya",
      byDate: localByDate || "avui",
      category: localCategory || DEFAULT_FILTER_VALUE,
      searchTerm: currentQueryParams.search || "",
      distance: isDistanceFilterActive ? parseInt(localDistance) : undefined,
      lat: isDistanceFilterActive ? location!.latitude : undefined,
      lon: isDistanceFilterActive ? location!.longitude : undefined,
    };

    const newUrl = buildFilterUrl(currentSegments, currentQueryParams, changes);

    sendEventToGA("Place", changes.place);
    sendEventToGA("ByDate", changes.byDate);
    sendEventToGA("Category", changes.category);
    if (changes.distance !== undefined) {
      sendEventToGA("Distance", changes.distance.toString());
    }

    startNavigationFeedback();
    setLoading(true);
    try {
      router.push(newUrl);
      onClose();
    } catch (error) {
      console.error("Navigation failed:", error);
      setLoading(false);
    }
  };

  const handleByDateChange = useCallback((value: string | number) => {
    setLocalByDate((prevValue) => (prevValue === value ? "" : value) as string);
  }, []);

  const handleCategoryChange = useCallback((value: string | number) => {
    setLocalCategory(
      (prevValue) => (prevValue === value ? "" : value) as string
    );
  }, []);

  const disablePlace: boolean =
    !isDragging &&
    !userLocationError &&
    localDistance !== undefined &&
    localDistance !== "" &&
    !Number.isNaN(Number(localDistance));

  // Allow distance interaction if coords exist in URL (for clearing) or if no place is selected
  const hasCoordinatesInUrl = Boolean(
    currentQueryParams.lat && currentQueryParams.lon
  );
  const disableDistance: boolean =
    (Boolean(localPlace) && !hasCoordinatesInUrl) || Boolean(userLocationError);

  const selectedOption = useMemo<Option | null>(() => {
    if (!localPlace) return null;
    for (const group of regionsAndCitiesArray) {
      const found = group.options.find((option) => option.value === localPlace);
      if (found) return found;
    }
    return null;
  }, [localPlace, regionsAndCitiesArray]);

  return (
    <>
      <Modal
        open={isOpen}
        setOpen={onClose}
        title="Filtres"
        actionButton="Aplicar filtres"
        onActionButtonClick={applyFilters}
        testId="filters-modal"
      >
        <div className="w-full flex flex-col justify-start items-start gap-5 py-4 pb-6">
          <fieldset className="w-full flex flex-col justify-start items-start gap-6">
            <p className="w-full font-semibold font-barlow uppercase pt-[5px]">
              Data
            </p>
            <div className="w-full flex flex-col justify-start items-start gap-x-3 gap-y-3 flex-wrap">
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
          <div className="w-full flex flex-col justify-start items-start gap-4">
            <p className="w-full font-semibold font-barlow uppercase pt-[5px]">
              Poblacions
            </p>
            <div className="w-full flex flex-col px-0">
              {isLoadingRegions ? (
                <SelectSkeleton />
              ) : (
                <Select
                  id="options"
                  title=""
                  options={regionsAndCitiesArray}
                  value={selectedOption}
                  onChange={handlePlaceChange}
                  isClearable
                  placeholder="Selecciona població"
                  isDisabled={disablePlace}
                  testId="place-select"
                />
              )}
            </div>
          </div>
          <fieldset className="w-full flex flex-col justify-start items-start gap-4">
            <p className="w-full font-semibold font-barlow uppercase">
              Categories
            </p>
            <div className="w-full grid grid-cols-3 gap-x-4 gap-y-2">
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
          <fieldset className="w-full flex flex-col justify-start items-start gap-6">
            <p className="w-full font-semibold font-barlow uppercase pt-[5px]">
              Distància
            </p>
            {(userLocationLoading || userLocationError) && (
              <div className="border-t border-border py-2">
                <div className="flex flex-col">
                  {userLocationLoading && (
                    <div className="text-sm text-border">
                      Carregant localització...
                    </div>
                  )}
                  {userLocationError && (
                    <div className="text-sm text-primary">
                      {userLocationError}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div
              className={`w-full flex flex-col justify-start items-start gap-3px-0 ${disableDistance ? "opacity-30" : ""
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
                onMouseDown={() => {
                  setIsDragging(true);
                }}
                onMouseUp={handleDragEnd}
                onTouchStart={() => {
                  setIsDragging(true);
                }}
                onTouchEnd={handleDragEnd}
                testId="distance-range"
              />
            </div>
          </fieldset>
        </div>
      </Modal>
    </>
  );
};

NavigationFiltersModal.displayName = "NavigationFiltersModal";

export default memo(NavigationFiltersModal);
