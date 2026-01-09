"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { KeyboardEvent } from "react";
import { useRouter, usePathname } from "../../../i18n/routing";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import { sendGoogleEvent } from "@utils/analytics";
import {
  MagnifyingGlassIcon as SearchIcon,
  ChevronDownIcon,
  XMarkIcon as XIcon,
} from "@heroicons/react/24/solid";
import { useLocale } from "next-intl";
import { startNavigationFeedback } from "@lib/navigation-feedback";
import { formatCatalanA, generateRegionsAndTownsOptions } from "@utils/helpers";
import { stripLocalePrefix } from "@utils/i18n-routing";
import { SelectSkeleton } from "@components/ui/common/skeletons";
import { Option } from "types/common";
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
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { place, label, placeType, setPlace, searchTerm, setSearchTerm, date } = useHero();

  // State for modal and location selection
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localPlaceValue, setLocalPlaceValue] = useState<string>("");
  const [hasOpenedModal, setHasOpenedModal] = useState(false);

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
          category: "hero_search",
          label: selectedOption.label,
          value: selectedOption.value,
        });
      }
    } else {
      // If cleared or null, default to Catalunya
      setPlace("catalunya", "Catalunya", "region");
    }
    setIsModalOpen(false);
  }, [localPlaceValue, allLocations, setPlace]);

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

  const displayLabel = useMemo(() => {
    if (place === "catalunya") return label;

    // EN/ES already include the preposition in surrounding copy (e.g. "What to do in").
    // Keep the visible label clean (no "a/al/a la...").
    if (locale !== "ca") return label;

    const withArticle = formatCatalanA(
      label,
      (placeType || "general") as "region" | "town" | "general",
      false
    );

    // Strip leading Catalan preposition/article forms.
    return withArticle
      .replace(/^a\s+l[’']/, "")
      .replace(/^a\s+les\s+/i, "")
      .replace(/^a\s+la\s+/i, "")
      .replace(/^als\s+/i, "")
      .replace(/^al\s+/i, "")
      .replace(/^a\s+/i, "");
  }, [label, locale, place, placeType]);

  // --- Search Logic ---

  const handleSearchSubmit = useCallback(() => {
    const value = searchTerm.trim();

    // Send analytics only for non-empty searches
    if (value) {
      sendGoogleEvent("search", {
        category: "hero_search",
        label: value,
        search_term: value,
        value: value,
      });
    }

    // Always navigate (even with empty search to clear the param)
    const url = buildHeroUrl(place, date, value);

    startNavigationFeedback();
    router.push(url);
  }, [searchTerm, place, date, router]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

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
        <h1 className="heading-1 flex flex-wrap items-center justify-center gap-2">
          <span>{t("titlePrefix")}</span>
          <div className="relative inline-block">
            <Button
              variant="ghost"
              onClick={() => {
                setLocalPlaceValue(place === "catalunya" ? "" : place);
                setHasOpenedModal(true);
                setIsModalOpen(true);
              }}
              className="flex flex-wrap items-center justify-center gap-2 text-primary text-center hover:underline decoration-2 underline-offset-4 transition-all hover:bg-transparent px-0 py-0"
              aria-expanded={isModalOpen}
            >
              {displayLabel}
              <ChevronDownIcon
                className={`h-8 w-8 transition-transform duration-200 ${isModalOpen ? "rotate-180" : ""
                  }`}
              />
            </Button>

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
          </div>
        </h1>
        <p className="body-large text-muted-foreground max-w-xl mx-auto">
          {subTitle || t("subtitleDefault")}
        </p>
      </div>

      {/* Search Bar */}
      <div className="w-full max-w-2xl mx-auto relative">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-foreground/40 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            className="w-full pl-11 pr-12 py-3 bg-background border border-border rounded-full shadow-sm hover:shadow-md focus:shadow-md focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-base placeholder:text-foreground/40"
            placeholder={t("searchPlaceholder", { location: label })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid="search-input"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-12 flex items-center px-2 text-foreground/40 hover:text-foreground transition-colors hover:bg-transparent"
              aria-label={t("clearSearch")}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleSearchSubmit}
            className="absolute inset-y-1 right-1 px-4 flex items-center justify-center rounded-full"
            data-testid="search-button"
            aria-label={t("search")}
          >
            <SearchIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
