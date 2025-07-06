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
import type { EventCategory } from "@store";
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

      const distance = currentQueryParams.distance || "";

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
            console.log("Error occurred. Error code: " + error.code);
            switch (error.code) {
              case 1:
                setUserLocationError(
                  "Permission denied. The user has denied the request for geolocation."
                );
                break;
              case 2:
                setUserLocationError(
                  "Position unavailable. Location information is unavailable."
                );
                break;
              case 3:
                setUserLocationError(
                  "Timeout. The request to get user location timed out."
                );
                break;
              default:
                setUserLocationError("An unknown error occurred.");
            }
            setUserLocationLoading(false);
          }
        );
      } else {
        console.log("Geolocation is not supported by this browser.");
        setUserLocationError("Geolocation is not supported by this browser.");
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
    const changes = {
      place: localPlace || "catalunya",
      byDate: localByDate || "avui",
      category: (localCategory || "tots") as EventCategory,
      searchTerm: currentQueryParams.search || "",
      distance: localDistance ? parseInt(localDistance) : 50,
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
  const disableDistance: boolean =
    Boolean(localPlace) || userLocationLoading || Boolean(userLocationError);

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
              <div className="border-t border-bColor py-2">
                <div className="flex flex-col">
                  {userLocationLoading && (
                    <div className="text-sm text-bColor">
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
