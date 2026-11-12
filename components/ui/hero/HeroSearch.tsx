"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter, usePathname } from "../../../i18n/routing";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import { useHeroSearchSubmit } from "@components/hooks/useHeroSearchSubmit";
import { useSearchCombobox } from "@components/hooks/useSearchCombobox";
import SearchSuggestions from "@components/ui/search/SearchSuggestionsLazy";
import { sendGoogleEvent, toSearchTermParam } from "@utils/analytics";
import {
  MagnifyingGlassIcon as SearchIcon,
  ChevronDownIcon,
  XMarkIcon as XIcon,
} from "@heroicons/react/24/solid";
import { useLocale } from "next-intl";
import { startNavigationFeedback } from "@lib/navigation-feedback";
import { generateRegionsAndTownsOptions } from "@utils/helpers";
import {
  formatPlacePrepositionParts,
  joinPlacePhrase,
} from "@utils/string-helpers";
import type { AppLocale } from "types/i18n";
import { stripLocalePrefix } from "@utils/i18n-routing";
import { SelectSkeleton } from "@components/ui/common/skeletons";
import { Option } from "types/common";
import type { SearchBoxSuggestion } from "types/search";
import { useHero } from "./HeroContext";
import { buildHeroUrl } from "./utils";
import Button from "@components/ui/common/button";

const Modal = dynamic(() => import("@components/ui/common/modal"), {
  loading: () => <></>,
  ssr: false,
});

const Select = dynamic(() => import("@components/ui/common/form/select"), {
  loading: () => <SelectSkeleton />,
  ssr: false,
});

export default function HeroSearch({ subTitle }: { subTitle?: string }) {
  const t = useTranslations("Components.HeroSearch");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { place, label, placeType, setPlace, searchTerm, setSearchTerm, date } = useHero();

  // State for modal and location selection
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localPlaceValue, setLocalPlaceValue] = useState<string>("");
  const [hasOpenedModal, setHasOpenedModal] = useState(false);

  // The Modal mounts on first open; fetch its chunk now so that open is instant.
  useEffect(() => {
    void import("@components/ui/common/modal");
  }, []);

  // --- Location Logic ---
  const isPlacePage = useMemo(() => {
    const { pathnameWithoutLocale } = stripLocalePrefix(pathname || "/");
    const segment = pathnameWithoutLocale?.split("/")[1];
    return !!segment && segment !== "catalunya" && pathnameWithoutLocale !== "/";
  }, [pathname]);

  const {
    regionsWithCities,
    isLoading: loadingRegions,
    isError: regionsError,
    mutate,
  } = useGetRegionsWithCities(hasOpenedModal || isPlacePage);

  const regionsAndCitiesArray = useMemo(() => {
    if (!regionsWithCities) return [];
    return generateRegionsAndTownsOptions(regionsWithCities);
  }, [regionsWithCities]);

  const isLoadingRegions =
    loadingRegions ||
    (!regionsWithCities && !regionsError);

  const allLocations = useMemo(() => {
    return regionsAndCitiesArray.flatMap((group) => group.options);
  }, [regionsAndCitiesArray]);

  useEffect(() => {
    const { pathnameWithoutLocale } = stripLocalePrefix(pathname || "/");
    const segment = pathnameWithoutLocale?.split("/")[1];
    if (segment && segment !== "catalunya") {
      const match = allLocations.find((loc) => loc.value === segment);
      if (match) {
        setPlace(match.value, match.label, match.placeType);
        return;
      }
      // Fallback: keep hero state aligned with URL even if regions data is missing
      const fallbackLabel = segment
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      setPlace(segment, fallbackLabel, "");
      return;
    }
    // If we are at root, ensure it's catalunya
    if (pathname === "/" || pathname === "/catalunya") {
      setPlace("catalunya", "Catalunya", "region");
    }
  }, [pathname, allLocations, setPlace]);

  // Sync initial search term from URL
  const urlSearchTerm = searchParams?.get("search") || "";
  useEffect(() => {
    setSearchTerm(urlSearchTerm);
  }, [urlSearchTerm, setSearchTerm]);

  const handleApplyLocation = useCallback(() => {
    if (localPlaceValue) {
      const selectedOption = allLocations.find(
        (loc) => loc.value === localPlaceValue
      );
      if (selectedOption) {
        setPlace(selectedOption.value, selectedOption.label, selectedOption.placeType);

        sendGoogleEvent("location_selected", {
          context: "hero_search",
          place_slug: selectedOption.value,
        });
      }
    } else {
      // If cleared or null, default to Catalunya
      setPlace("catalunya", "Catalunya", "region");
    }
    setIsModalOpen(false);
  }, [allLocations, localPlaceValue, setPlace]);

  const handlePlaceChange = useCallback((option: Option | null) => {
    setLocalPlaceValue(option?.value || "");
  }, []);

  // Compute selected option from string value - use actual object from regionsAndCitiesArray
  const selectedOption = useMemo<Option | null>(() => {
    if (!localPlaceValue) return null;
    // Find the actual option object from the grouped array to preserve object reference
    for (const group of regionsAndCitiesArray) {
      const found = group.options.find((option) => option.value === localPlaceValue);
      if (found) return found;
    }
    return null;
  }, [localPlaceValue, regionsAndCitiesArray]);

  // The preposition joins the title prefix so the button shows only the place:
  // "Què fer al" + "Masnou", "Qué hacer en" + "El Masnou".
  const placeParts = useMemo(
    () =>
      formatPlacePrepositionParts(label, placeType, locale, false),
    [label, placeType, locale]
  );
  const placeIn = joinPlacePhrase(placeParts);

  // --- Search Logic ---
  const submitSearch = useHeroSearchSubmit("hero_search");

  const handleSearchSubmit = useCallback((suggestion?: SearchBoxSuggestion) => {
    const value = searchTerm.trim();

    // Send analytics only for non-empty searches
    if (value) {
      sendGoogleEvent("search", {
        context: "hero_search",
        search_term: toSearchTermParam(value),
      });
    }

    submitSearch(suggestion);
  }, [searchTerm, submitSearch]);

  const submitTypedSearch = useCallback(() => handleSearchSubmit(), [handleSearchSubmit]);

  const { anchorRef, inputProps, popupProps } = useSearchCombobox({
    value: searchTerm,
    setValue: setSearchTerm,
    context: "hero_search",
    onSubmit: submitTypedSearch,
    onSelect: handleSearchSubmit,
  });

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    const url = buildHeroUrl(place, date, "");
    startNavigationFeedback();
    router.push(url);
  }, [place, date, router, setSearchTerm]);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Title Section */}
      <div className="flex flex-col items-center justify-center text-center gap-2">
        <h1 className="heading-1 text-white drop-shadow-lg flex flex-wrap items-center justify-center gap-2">
          <span>{`${t("titlePrefix")} ${placeParts.preposition}`}</span>{" "}
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => {
                setLocalPlaceValue(place === "catalunya" ? "" : place);
                setHasOpenedModal(true);
                setIsModalOpen(true);
              }}
              className="flex flex-wrap items-center justify-center gap-2 font-semibold uppercase tracking-wide text-white text-center border-b-2 border-white/40 hover:border-white/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
              aria-expanded={isModalOpen}
            >
              {placeParts.place}
              <ChevronDownIcon
                className={`h-8 w-8 transition-transform duration-200 ${isModalOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {/* Mounted on first open, then kept for the close animation. While
                closed, the ssr:false Modal's bailout sat inside the hero <h1>
                and caused hydration error #418 on the home page. */}
            {hasOpenedModal && (
              <Modal
                open={isModalOpen}
                setOpen={setIsModalOpen}
                title={t("modalTitle")}
                actionButton={t("modalAction")}
                onActionButtonClick={handleApplyLocation}
                testId="location-modal"
              >
                <div className="w-full flex flex-col justify-start items-start gap-4 py-4">
                  <div className="w-full flex flex-col px-0">
                    {isLoadingRegions ? (
                      <SelectSkeleton />
                    ) : regionsError ? (
                      <div className="flex flex-col items-center gap-2 text-center py-4">
                        <p className="text-destructive">
                          {t("errorLoadingLocations")}
                        </p>
                        <Button onClick={() => mutate()} variant="outline" className="text-sm">
                          {t("retry")}
                        </Button>
                      </div>
                    ) : (
                      <Select
                        id="hero-location-select"
                        title=""
                        options={regionsAndCitiesArray}
                        value={selectedOption}
                        onChange={handlePlaceChange}
                        isClearable
                        placeholder={t("selectPlaceholder")}
                        testId="hero-location-select"
                        autoFocus
                        menuPosition="fixed"
                      />
                    )}
                  </div>
                </div>
              </Modal>
            )}
          </div>
        </h1>
        <p className="body-large text-white/90 drop-shadow-md max-w-xl mx-auto" data-speakable="description">
          {subTitle || t("subtitleDefault")}
        </p>
      </div>

      {/* Search Bar */}
      <div className="w-full max-w-2xl mx-auto relative">
        <div ref={anchorRef} className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            className="w-full pl-11 pr-12 py-3 bg-background border border-input rounded-full shadow-sm hover:shadow-md focus:shadow-md focus:border-primary focus:ring-1 focus:ring-primary transition-[box-shadow,border-color] outline-none text-base placeholder:text-muted-foreground"
            placeholder={t("searchPlaceholder", { placeIn })}
            value={searchTerm}
            {...inputProps}
            autoComplete="off"
            aria-label={t("search")}
            data-testid="search-input"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-12 flex items-center px-1.5 text-muted-foreground hover:text-foreground transition-colors hover:bg-transparent"
              aria-label={t("clearSearch")}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="primary"
            onClick={submitTypedSearch}
            className="absolute inset-y-1 right-1 min-h-0 px-3.5 flex items-center justify-center rounded-full"
            data-testid="search-button"
            aria-label={t("search")}
          >
            <SearchIcon className="h-5 w-5" />
          </Button>
        </div>
        {popupProps && <SearchSuggestions {...popupProps} />}
      </div>
    </div>
  );
}
