import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  memo,
  ChangeEvent,
  FC,
} from "react";
import dynamic from "next/dynamic";
import RadioInput from "@components/ui/common/form/radioInput";
import RangeInput from "@components/ui/common/form/rangeInput";
import { BYDATES, CATEGORY_NAMES_MAP, DISTANCES } from "@utils/constants";
import { sendEventToGA } from "@utils/helpers";
import useStore, { UserLocation, EventCategory } from "@store";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import type { Option } from "types/common";

interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}

const Modal = dynamic(() => import("@components/ui/common/modal"), {
  loading: () => <></>,
});

const Select = dynamic(() => import("@components/ui/common/form/select"), {
  loading: () => <></>,
});

interface GroupedOption {
  label: string;
  options: Option[];
}

interface GeolocationError {
  code: number;
  message: string;
}

const FiltersModal: FC = () => {
  const {
    openModal,
    place,
    byDate,
    category,
    distance,
    userLocation,
    setState,
  } = useStore((state) => ({
    openModal: state.openModal,
    place: state.place,
    byDate: state.byDate,
    category: state.category,
    distance: state.distance,
    userLocation: state.userLocation,
    setState: state.setState,
  }));

  const [localPlace, setLocalPlace] = useState<string>(place);
  const [localByDate, setLocalByDate] = useState<string>(byDate);
  const [localCategory, setLocalCategory] = useState<string>(category);
  const [localDistance, setLocalDistance] = useState<string>(distance);
  const [localUserLocation, setLocalUserLocation] =
    useState<UserLocation | null>(userLocation);
  const [userLocationLoading, setUserLocationLoading] =
    useState<boolean>(false);
  const [userLocationError, setUserLocationError] = useState<string>("");
  const [selectOption, setSelectOption] = useState<Option | null>(null);

  const { regionsWithCities, isLoading: isLoadingRegionsWithCities } =
    useGetRegionsWithCities();

  const regionsAndCitiesArray: GroupedOption[] = useMemo(() => {
    if (!regionsWithCities) return [];
    return regionsWithCities.map((region) => ({
      label: region.name,
      options: region.cities.map((city) => ({
        label: city.label,
        value: city.value,
      })),
    }));
  }, [regionsWithCities]);

  useEffect(() => {
    if (openModal) {
      setLocalPlace(place);
      setLocalByDate(byDate);
      setLocalCategory(category);
      setLocalDistance(distance);
      setLocalUserLocation(userLocation);
      const regionOption = regionsAndCitiesArray
        .flatMap((group) => group.options)
        .find((option) => option.value === place);
      setSelectOption(regionOption || null);
    }
  }, [
    openModal,
    place,
    byDate,
    category,
    distance,
    userLocation,
    regionsAndCitiesArray,
  ]);

  const handlePlaceChange = useCallback(
    (option: Option | null) => {
      const regionOption = regionsAndCitiesArray
        .flatMap((group) => group.options)
        .find((opt) => opt.value === option?.value);
      setLocalPlace(option?.value || "");
      setSelectOption(regionOption || null);
    },
    [regionsAndCitiesArray]
  );

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
            const location: UserLocation = {
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

  const disablePlace: boolean =
    localDistance === undefined ||
    localDistance !== "" ||
    Number.isNaN(Number(localDistance));
  const disableDistance: boolean =
    Boolean(localPlace) || userLocationLoading || Boolean(userLocationError);

  const applyFilters = () => {
    setState("place", localPlace);
    setState("byDate", localByDate);
    setState("category", localCategory as EventCategory | "");
    setState("distance", localDistance);
    setState("userLocation", localUserLocation);
    setState("filtersApplied", true);

    sendEventToGA("Place", localPlace);
    sendEventToGA("ByDate", localByDate);
    sendEventToGA("Category", localCategory);
    sendEventToGA("Distance", localDistance);

    if (!localPlace) {
      setState("place", "");
    }

    setState("openModal", false);
  };

  const handleByDateChange = useCallback((value: string | number) => {
    setLocalByDate((prevValue) => (prevValue === value ? "" : value) as string);
  }, []);

  const handleCategoryChange = useCallback((value: string | number) => {
    setLocalCategory(
      (prevValue) => (prevValue === value ? "" : value) as string
    );
  }, []);

  return (
    <>
      <Modal
        open={openModal}
        setOpen={(value: boolean) => setState("openModal", value)}
        title="Filtres"
        actionButton="Aplicar filtres"
        onActionButtonClick={applyFilters}
      >
        <div className="w-full h-full flex flex-col justify-center items-center gap-5 py-8">
          <div className="w-full flex flex-col justify-center items-center gap-4">
            <p className="w-full font-semibold font-barlow uppercase pt-[5px]">
              Poblacions
            </p>
            <div className="w-full flex flex-col px-0">
              <Select
                id="options"
                title="Poblacions"
                options={regionsAndCitiesArray.flatMap(
                  (group) => group.options
                )}
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
            <div className="w-full h-28 flex flex-col justify-start items-start gap-2 flex-wrap">
              {Object.entries(CATEGORY_NAMES_MAP).map(([key, value]) => (
                <RadioInput
                  key={key}
                  id={key}
                  name="category"
                  value={key}
                  checkedValue={localCategory}
                  onChange={handleCategoryChange}
                  label={value}
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
                value={Number(localDistance)}
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

FiltersModal.displayName = "FiltersModal";

export default memo(FiltersModal);
