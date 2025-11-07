import { useMemo, useState, useCallback, memo, ChangeEvent, FC, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import RadioInput from "@components/ui/common/form/radioInput";
import RangeInput from "@components/ui/common/form/rangeInput";
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
import { NavigationFiltersModalProps } from "types/props";

const Modal = dynamic(() => import("@components/ui/common/modal"), {
  loading: () => <></>,
});

const Select = dynamic(() => import("@components/ui/common/form/select"), {
  loading: () => <></>,
});

const NavigationFiltersModal: FC<NavigationFiltersModalProps> = ({
  isOpen,
  onClose,
  currentSegments,
  currentQueryParams,
  userLocation: initialUserLocation,
  categories = [],
}) => {
  const { regionsWithCities, isLoading: isLoadingRegionsWithCities } =
    useGetRegionsWithCities();

  const regionsAndCitiesArray: GroupedOption[] = useMemo(() => {
    if (!regionsWithCities) return [];
    return generateRegionsAndTownsOptions(regionsWithCities);
  }, [regionsWithCities]);

  const defaults = useMemo(() => {
    const place =
      currentSegments.place === "catalunya" ? "" : currentSegments.place;
    const byDate = currentSegments.date;
    const category =
      currentSegments.category === "tots" ? "" : currentSegments.category;
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
  }, [currentSegments, currentQueryParams, initialUserLocation, regionsAndCitiesArray]);

  const [localPlace, setLocalPlace] = useState<string>(defaults.place);
  const [localByDate, setLocalByDate] = useState<string>(defaults.byDate);
  const [localCategory, setLocalCategory] = useState<string>(defaults.category);
  const [localDistance, setLocalDistance] = useState<string>(defaults.distance);
  const [localUserLocation, setLocalUserLocation] = useState(defaults.userLocation);
  const [userLocationLoading, setUserLocationLoading] = useState<boolean>(false);
  const [userLocationError, setUserLocationError] = useState<string>("");

  // Reset local state whenever the modal opens or the default inputs change while open
  useEffect(() => {
    if (!isOpen) return;
    setLocalPlace(defaults.place);
    setLocalByDate(defaults.byDate);
    setLocalCategory(defaults.category);
    setLocalDistance(defaults.distance);
    setLocalUserLocation(defaults.userLocation);
    setUserLocationLoading(false);
    setUserLocationError("");
  }, [
    isOpen,
    defaults.place,
    defaults.byDate,
    defaults.category,
    defaults.distance,
    defaults.userLocation,
  ]);

  const router = useRouter();

  const handlePlaceChange = useCallback((option: Option | null) => {
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
      }
    },
    [localUserLocation]
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
      category: localCategory || "tots",
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
      (prevValue) => (prevValue === value ? "" : value) as string
    );
  }, []);

  const disablePlace: boolean =
    localDistance !== undefined &&
    localDistance !== "" &&
    !Number.isNaN(Number(localDistance));

  // Allow distance interaction if coords exist in URL (for clearing) or if no place is selected
  const hasCoordinatesInUrl = Boolean(
    currentQueryParams.lat && currentQueryParams.lon
  );
  const disableDistance: boolean =
    (Boolean(localPlace) && !hasCoordinatesInUrl) ||
    userLocationLoading ||
    Boolean(userLocationError);

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
      >
        <div className="w-full h-full flex flex-col justify-start items-start gap-5 py-8">
          <div className="w-full flex flex-col justify-start items-start gap-4">
            <p className="w-full font-semibold font-barlow uppercase pt-[5px]">
              Poblacions
            </p>
            <div className="w-full flex flex-col px-0">
              <Select
                id="options"
                title="Poblacions"
                options={regionsAndCitiesArray}
                value={selectedOption}
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
              className={`w-full flex flex-col justify-start items-start gap-3px-0 ${
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
      </Modal>
    </>
  );
};

NavigationFiltersModal.displayName = "NavigationFiltersModal";

export default memo(NavigationFiltersModal);
