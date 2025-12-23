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
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "../../../i18n/routing";
import dynamic from "next/dynamic";
import RadioInput from "@components/ui/common/form/radioInput";
import RangeInput from "@components/ui/common/form/rangeInput";
import { BYDATES, DISTANCES, DEFAULT_FILTER_VALUE } from "@utils/constants";
import { sendEventToGA, generateRegionsAndTownsOptions } from "@utils/helpers";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import type { Option, PlaceType } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import {
  GeolocationPosition,
  GroupedOption,
  GeolocationError,
} from "types/common";
import { CATEGORY_CONFIG } from "@config/categories";
import { buildFilterUrl } from "@utils/url-filters";
import { preserveMapViewParam } from "@utils/view-mode";
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
  const tByDates = useTranslations("Config.ByDates");
  const tCategories = useTranslations("Config.Categories");
  const tSeoCategoryData = useTranslations("Partials.GeneratePagesData");
  const {
    regionsWithCities,
    isLoading: isLoadingRegionsWithCities,
    isError: isErrorRegionsWithCities,
  } = useGetRegionsWithCities(isOpen);
  const t = useTranslations("Components.FiltersModal");

  const getCategoryLabel = useCallback(
    (category: CategorySummaryResponseDTO): string => {
      const normalizedSlug =
        typeof category.slug === "string" ? category.slug.toLowerCase() : "";

      const config = normalizedSlug ? CATEGORY_CONFIG[normalizedSlug] : undefined;
      if (config?.labelKey) {
        return tCategories(config.labelKey);
      }

      if (normalizedSlug) {
        const seoKey = `categories.${normalizedSlug}.titleSuffix` as Parameters<
          typeof tSeoCategoryData
        >[0];
        if (tSeoCategoryData.has(seoKey)) {
          return tSeoCategoryData(seoKey);
        }
      }

      return category.name;
    },
    [tCategories, tSeoCategoryData]
  );

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
      placeType: (regionOption?.placeType || "") as PlaceType,
      placeCoords:
        regionOption?.latitude && regionOption?.longitude
          ? { latitude: regionOption.latitude, longitude: regionOption.longitude }
          : undefined,
    };
  }, [
    currentSegments,
    currentQueryParams,
    initialUserLocation,
    regionsAndCitiesArray,
  ]);

  const defaultDistanceValue = defaults.distance || DISTANCES[1].toString();
  const initialUseCurrentLocation = useMemo(
    () =>
      Boolean(
        defaults.distance &&
        !defaults.place &&
        !defaults.placeCoords &&
        (defaults.userLocation ||
          (currentQueryParams.lat && currentQueryParams.lon))
      ),
    [
      currentQueryParams.lat,
      currentQueryParams.lon,
      defaults.distance,
      defaults.place,
      defaults.placeCoords,
      defaults.userLocation,
    ]
  );
  const [localPlace, setLocalPlace] = useState<string>(defaults.place);
  const [localByDate, setLocalByDate] = useState<string>(defaults.byDate);
  const [localCategory, setLocalCategory] = useState<string>(defaults.category);
  const [localDistance, setLocalDistance] = useState<string>(defaults.distance);
  const [localUserLocation, setLocalUserLocation] = useState(
    defaults.userLocation
  );
  const [localPlaceType, setLocalPlaceType] = useState<PlaceType>(
    defaults.placeType
  );
  const [localPlaceCoords, setLocalPlaceCoords] = useState<{
    latitude: number;
    longitude: number;
  } | undefined>(defaults.placeCoords);
  const [userLocationLoading, setUserLocationLoading] =
    useState<boolean>(false);
  const [userLocationError, setUserLocationError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const geolocationPromiseRef = useRef<Promise<
    { latitude: number; longitude: number } | undefined
  > | null>(null);
  const [isDistanceActive, setIsDistanceActive] = useState<boolean>(
    Boolean(defaults.distance)
  );
  const [useCurrentLocationMode, setUseCurrentLocationMode] =
    useState<boolean>(initialUseCurrentLocation);

  // Reset local state whenever the modal opens or the default inputs change while open
  useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => {
      setLocalPlace(defaults.place);
      setLocalByDate(defaults.byDate);
      setLocalCategory(defaults.category);
      setLocalDistance(defaults.distance);
      setLocalUserLocation(defaults.userLocation);
      setLocalPlaceType(defaults.placeType);
      setLocalPlaceCoords(defaults.placeCoords);
      setUserLocationLoading(false);
      setUserLocationError("");
      setIsDistanceActive(Boolean(defaults.distance));
      setUseCurrentLocationMode(initialUseCurrentLocation);
    }, 0);
    return () => window.clearTimeout(id);
  }, [
    isOpen,
    defaults.place,
    defaults.byDate,
    defaults.category,
    defaults.distance,
    defaults.userLocation,
    defaults.placeType,
    defaults.placeCoords,
    initialUseCurrentLocation,
  ]);

  const router = useRouter();
  const locale = useLocale();
  const { setLoading } = useFilterLoading();

  const handlePlaceChange = useCallback(
    (option: Option | null) => {
      setLocalPlace(option?.value || "");
      setLocalPlaceType(option?.placeType || "");
      setUseCurrentLocationMode(false);

      if (option?.latitude && option?.longitude) {
        setLocalPlaceCoords({
          latitude: option.latitude,
          longitude: option.longitude,
        });
        setUserLocationError("");

        // If the user already enabled distance but had it cleared, prefill a sensible default
        if (isDistanceActive && !localDistance) {
          setLocalDistance(defaultDistanceValue);
        }
      } else {
        setLocalPlaceCoords(undefined);
        // If selecting a region (no coords), clear distance since it can't be used
        if (option?.placeType === "region") {
          setLocalDistance("");
          setIsDistanceActive(false);
        }
      }
    },
    [defaultDistanceValue, isDistanceActive, localDistance]
  );

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

    const pendingPromise = new Promise<
      { latitude: number; longitude: number } | undefined
    >((resolve) => {
      const resolveAndClear = (
        value: { latitude: number; longitude: number } | undefined
      ) => {
        geolocationPromiseRef.current = null;
        resolve(value);
      };

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position: GeolocationPosition) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };

            setLocalUserLocation(location);
            setUserLocationLoading(false);
            resolveAndClear(location);
          },
          (error: GeolocationError) => {
            setUserLocationLoading(false);

            switch (error.code) {
              case 1: // PERMISSION_DENIED
                setUserLocationError(t("geo.permissionDenied"));
                break;
              case 2: // POSITION_UNAVAILABLE
                setUserLocationError(t("geo.positionUnavailable"));
                break;
              case 3: // TIMEOUT
                setUserLocationError(t("geo.timeout"));
                break;
              default:
                setUserLocationError(t("geo.genericError"));
            }

            resolveAndClear(undefined);
          },
          {
            enableHighAccuracy: false, // Don't require GPS, allow network location
            timeout: 10000, // 10 second timeout
            maximumAge: 300000, // Accept cached location up to 5 minutes old
          }
        );
      } else {
        console.log("Geolocation is not supported by this browser.");
        setUserLocationError(t("geo.unsupported"));
        setUserLocationLoading(false);
        resolveAndClear(undefined);
      }
    });

    geolocationPromiseRef.current = pendingPromise;
    setUserLocationLoading(true);
    setUserLocationError("");

    return pendingPromise;
  }, [localUserLocation, t, userLocationLoading]);

  const handleUserLocation = useCallback(
    (value: string) => {
      // Always update the visual value immediately
      setIsDistanceActive(true);
      setLocalDistance(value);

      // If dragging, don't trigger geolocation yet
      if (isDragging) {
        return;
      }

      // Not dragging, proceed with geolocation only when we don't have place coordinates
      if (!localPlaceCoords) {
        void triggerGeolocation();
      }
    },
    [isDragging, triggerGeolocation, localPlaceCoords]
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

  const handleClearDistance = useCallback(() => {
    setLocalDistance("");
    setIsDistanceActive(false);
    setUserLocationError("");
  }, []);

  const handleUseMyLocation = useCallback(() => {
    setLocalPlace("");
    setLocalPlaceType("");
    setLocalPlaceCoords(undefined);
    setIsDistanceActive(true);
    setUseCurrentLocationMode(true);
    if (!localDistance) {
      setLocalDistance(defaultDistanceValue);
    }
    void triggerGeolocation();
  }, [triggerGeolocation, localDistance, defaultDistanceValue]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    // Trigger geolocation directly (bypassing state check since we just set isDragging to false)
    if (
      !localPlaceCoords &&
      !localUserLocation &&
      !userLocationLoading &&
      localDistance
    ) {
      void triggerGeolocation();
    }
  }, [
    localUserLocation,
    userLocationLoading,
    localDistance,
    localPlaceCoords,
    triggerGeolocation,
  ]);

  const toggleDistanceActive = useCallback(() => {
    const distanceUnavailable =
      localPlaceType === "region" ||
      (!localPlaceCoords && Boolean(userLocationError));

    if (distanceUnavailable) {
      return;
    }

    setIsDistanceActive((prev) => {
      const next = !prev;

      if (next && !localDistance) {
        setLocalDistance(defaultDistanceValue);
        if (!localPlaceCoords) {
          void triggerGeolocation();
        }
      }

      if (!next) {
        setLocalDistance("");
        setUseCurrentLocationMode(false);
      }

      return next;
    });
  }, [
    defaultDistanceValue,
    localDistance,
    localPlaceCoords,
    localPlaceType,
    triggerGeolocation,
    userLocationError,
    setUseCurrentLocationMode,
  ]);

  const applyFilters = async (): Promise<boolean> => {
    const hasDistance =
      isDistanceActive && Boolean(localDistance && localDistance !== "");
    let location = localUserLocation;

    // If distance is set but we don't yet have a location, request it before applying
    // Only if we are NOT using a specific place's coordinates
    if (hasDistance && !location && !userLocationError && !localPlaceCoords) {
      location = await triggerGeolocation();
      // If geolocation failed, location will be undefined. Stop here to let user see the error.
      if (!location) {
        return false;
      }
    }

    const hasUserLocation = Boolean(location);
    const hasPlaceCoords = Boolean(localPlaceCoords);
    const isDistanceFilterActive =
      hasDistance && (hasUserLocation || hasPlaceCoords);

    const changes = {
      // Clear place when using distance filter with user location, but KEEP it if using place coords
      place:
        isDistanceFilterActive && !localPlaceCoords
          ? "catalunya"
          : localPlace || "catalunya",
      byDate: localByDate || "avui",
      category: localCategory || DEFAULT_FILTER_VALUE,
      searchTerm: currentQueryParams.search || "",
      distance: isDistanceFilterActive ? parseInt(localDistance) : undefined,
      lat: isDistanceFilterActive
        ? localPlaceCoords?.latitude ?? location?.latitude
        : undefined,
      lon: isDistanceFilterActive
        ? localPlaceCoords?.longitude ?? location?.longitude
        : undefined,
    };

    const newUrl = buildFilterUrl(currentSegments, currentQueryParams, changes);

    const finalUrl =
      typeof window === "undefined"
        ? newUrl
        : preserveMapViewParam(newUrl, window.location.search);

    // `buildFilterUrl` returns a canonical URL WITHOUT a locale prefix.
    // On locale-prefixed routes (e.g. `/es/catalunya`), `window.location.pathname`
    // includes the prefix, which would incorrectly look like a change and leave the
    // loading gate stuck when the router normalizes back to the same URL.
    const currentUrl = (() => {
      if (typeof window === "undefined") return "";

      const { pathname, search } = window.location;
      const localePrefix = `/${locale}`;
      const normalizedPathname =
        pathname === localePrefix
          ? "/"
          : pathname.startsWith(`${localePrefix}/`)
            ? pathname.slice(localePrefix.length) || "/"
            : pathname;

      return `${normalizedPathname}${search}`;
    })();

    // If nothing changed, avoid triggering loading state that won't auto-reset
    if (currentUrl === finalUrl) {
      return true;
    }

    sendEventToGA("Place", changes.place, "filters_modal_apply");
    sendEventToGA("ByDate", changes.byDate, "filters_modal_apply");
    sendEventToGA("Category", changes.category, "filters_modal_apply");
    if (changes.distance !== undefined) {
      sendEventToGA("Distance", changes.distance.toString(), "filters_modal_apply");
    }

    startNavigationFeedback();
    setLoading(true);
    router.push(finalUrl);
    return true;
  };

  const handleByDateChange = useCallback((value: string | number) => {
    setLocalByDate((prevValue) => (prevValue === value ? "" : value) as string);
  }, []);

  const handleCategoryChange = useCallback((value: string | number) => {
    setLocalCategory(
      (prevValue) => (prevValue === value ? "" : value) as string
    );
  }, []);

  // Determine if the selected place is a region (comarca) - regions don't have coordinates
  const isRegionSelected = localPlaceType === "region";

  const isPlaceSelectDisabled =
    useCurrentLocationMode && isDistanceActive && !isRegionSelected;

  // Distance is disabled when:
  // 1. A region is selected (regions don't have a single point for radius search)
  // 2. Geolocation failed and no place with coords is selected
  const disableDistance: boolean =
    isRegionSelected ||
    (!localPlaceCoords && Boolean(userLocationError));
  const distanceControlDisabled = disableDistance || !isDistanceActive;

  const selectedOption = useMemo<Option | null>(() => {
    if (!localPlace) return null;
    for (const group of regionsAndCitiesArray) {
      const found = group.options.find((option) => option.value === localPlace);
      if (found) return found;
    }
    return null;
  }, [localPlace, regionsAndCitiesArray]);

  const distanceLabel = useMemo(() => {
    if (isRegionSelected) {
      return t("distance.label");
    }
    if (selectedOption && localPlaceCoords) {
      return t("distance.labelFromPlace", { place: selectedOption.label });
    }
    return t("distance.labelFromLocation");
  }, [selectedOption, localPlaceCoords, isRegionSelected, t]);

  // Helper text explaining the distance filter behavior
  const distanceHelperText = useMemo(() => {
    if (isRegionSelected) {
      return t("distance.helperRegion");
    }
    return t("distance.helperPlace");
  }, [isRegionSelected, t]);

  const shouldShowGeolocationFeedback =
    isDistanceActive &&
    (userLocationLoading || userLocationError) &&
    !localPlaceCoords &&
    !isRegionSelected;

  const useLocationLabel = useMemo(
    () =>
      useCurrentLocationMode
        ? t("useLocation.using")
        : t("useLocation.cta"),
    [useCurrentLocationMode, t]
  );

  return (
    <>
      <Modal
        open={isOpen}
        setOpen={onClose}
        title={t("modal.title")}
        actionButton={t("modal.action")}
        onActionButtonClick={applyFilters}
        testId="filters-modal"
      >
        <div className="w-full flex flex-col justify-start items-start gap-5 py-4 pb-6">
          <div className="w-full flex flex-col justify-start items-start gap-4">
            <p className="w-full font-semibold font-barlow uppercase pt-[5px]">
              {t("modal.locations")}
            </p>
            <div className="w-full flex flex-col gap-2">
              <div className="w-full flex flex-col px-0">
                {isLoadingRegions ? (
                  <SelectSkeleton />
                ) : isErrorRegionsWithCities ? (
                  <div className="text-destructive text-sm py-2">
                    {t("modal.loadError")}
                  </div>
                ) : (
                  <Select
                    id="options"
                    title=""
                    options={regionsAndCitiesArray}
                    value={selectedOption}
                    onChange={handlePlaceChange}
                    isClearable
                    placeholder={t("modal.selectPlaceholder")}
                    isDisabled={isPlaceSelectDisabled}
                    testId="place-select"
                  />
                )}
              </div>
              {/* Show "Use my location" when a place is selected - either region or town with coords */}
              <button
                onClick={handleUseMyLocation}
                className="text-xs text-primary underline self-start hover:text-primary/80 transition-colors"
                data-testid="use-my-location-btn"
              >
                {useLocationLabel}
              </button>
              {useCurrentLocationMode && (
                <div className="text-xs text-border flex items-center gap-2">
                  {t("useLocation.active")}
                  <button
                    onClick={() => setUseCurrentLocationMode(false)}
                    className="text-primary underline hover:text-primary/80 transition-colors"
                  >
                    {t("useLocation.switchToPlace")}
                  </button>
                </div>
              )}
              {isRegionSelected && (
                <div className="text-xs text-border bg-background border border-border rounded-md p-2">
                  {t("useLocation.regionNotice")}
                </div>
              )}
            </div>
            <fieldset className="w-full flex flex-col justify-start items-start gap-6">
              <p className="w-full font-semibold font-barlow uppercase pt-[5px]">
                {t("modal.dateHeading")}
              </p>
              <div className="w-full flex flex-col justify-start items-start gap-x-3 gap-y-3 flex-wrap">
                {BYDATES.map(({ value, labelKey }) => (
                  <RadioInput
                    key={value}
                    id={value}
                    name="byDate"
                    value={value}
                    checkedValue={localByDate}
                    onChange={handleByDateChange}
                    label={tByDates(labelKey)}
                  />
                ))}
              </div>
            </fieldset>
            {categories.length > 0 && (
              <fieldset className="w-full flex flex-col justify-start items-start gap-4">
                <p className="w-full font-semibold font-barlow uppercase">
                  {t("modal.categoriesHeading")}
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
                      label={getCategoryLabel(category)}
                    />
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset className="w-full flex flex-col justify-start items-start gap-6">
              <div className="w-full flex items-center justify-between gap-3">
                <p className="font-semibold font-barlow uppercase pt-[5px]">
                  {distanceLabel}
                </p>
                <label
                  className={`flex items-center gap-2 text-xs font-semibold ${disableDistance ? "text-border" : "text-primary"}`}
                >
                  <input
                    type="checkbox"
                    checked={isDistanceActive && !disableDistance}
                    onChange={toggleDistanceActive}
                    disabled={disableDistance}
                    className="h-4 w-4 accent-primary rounded border-border"
                    data-testid="distance-toggle"
                  />
                  {t("distance.toggle")}
                </label>
              </div>
              <p className={`text-sm -mt-2 ${isRegionSelected ? "text-destructive" : "text-border"}`}>
                {distanceHelperText}
                {isRegionSelected && (
                  <>
                    {" "}
                    <button
                      onClick={handleUseMyLocation}
                      className="text-primary underline hover:text-primary/80 transition-colors"
                    >
                      {t("useLocation.cta")}
                    </button>
                  </>
                )}
              </p>
              {shouldShowGeolocationFeedback && (
                <div className="border-t border-border py-2">
                  <div className="flex flex-col">
                    {userLocationLoading && (
                      <div className="text-sm text-border">
                        {t("geo.loading")}
                      </div>
                    )}
                    {userLocationError && (
                      <div className="text-sm text-destructive">
                        {userLocationError}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div
                className={`w-full flex flex-col justify-start items-start gap-3 px-0 transition-opacity ${distanceControlDisabled ? "opacity-30 pointer-events-none" : ""
                  }`}
              >
                <RangeInput
                  key="distance"
                  id="distance"
                  min={Number(DISTANCES[0])}
                  max={Number(DISTANCES[DISTANCES.length - 1])}
                  value={
                    isDistanceActive
                      ? Number(localDistance || defaultDistanceValue)
                      : Number(DISTANCES[0])
                  }
                  onChange={handleDistanceChange}
                  label={t("distance.rangeLabel")}
                  disabled={distanceControlDisabled}
                  onMouseDown={() => {
                    setIsDragging(true);
                  }}
                  onMouseUp={handleDragEnd}
                  onTouchStart={() => {
                    setIsDragging(true);
                  }}
                  onTouchEnd={handleDragEnd}
                  onClear={handleClearDistance}
                  testId="distance-range"
                />
              </div>
            </fieldset>
          </div>
        </div>
      </Modal>
    </>
  );
};

NavigationFiltersModal.displayName = "NavigationFiltersModal";

export default memo(NavigationFiltersModal);
