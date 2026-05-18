"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
  ChangeEvent,
  KeyboardEvent,
  JSX,
} from "react";
import { useRouter, usePathname } from "../../../i18n/routing";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  XMarkIcon as XIcon,
  MagnifyingGlassIcon as SearchIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";
import { sendGoogleEvent } from "@utils/analytics";
import { matchSearchToPlace } from "@utils/string-helpers";
import { startNavigationFeedback } from "@lib/navigation-feedback";
import { useFilterLoading } from "@components/context/FilterLoadingContext";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import { transformRegionsToOptions } from "@components/ui/locationDiscoveryWidget/utils";

const sendSearchTermGA = (searchTerm: string): void => {
  if (searchTerm && searchTerm.length > 0) {
    sendGoogleEvent("search", {
      category: "search",
      label: searchTerm,
      search_term: searchTerm,
      value: searchTerm,
    });
  }
};

export default function Search(): JSX.Element {
  const t = useTranslations("Components.SearchBar");
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const { setLoading } = useFilterLoading();

  // Lazy-load places for place-name detection (SWR-cached 24h, no cost if unused)
  const [hasSearched, setHasSearched] = useState(false);
  const { regionsWithCities } = useGetRegionsWithCities(hasSearched);
  const places = useMemo(
    () => (regionsWithCities ? transformRegionsToOptions(regionsWithCities) : []),
    [regionsWithCities]
  );

  // Get current search term from URL
  const urlSearchTerm = searchParams?.get("search") || "";

  const [inputValue, setInputValue] = useState<string>(urlSearchTerm);

  // Function to update URL with search parameter
  const updateSearchUrl = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() || "");

      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }

      // Build new URL preserving current path structure (no trailing slash)
      const queryString = params.toString();
      const basePath = isHomePage ? "/catalunya" : pathname || "/";
      const newUrl = queryString ? `${basePath}?${queryString}` : basePath;

      startNavigationFeedback();
      startTransition(() => setLoading(true));
      router.push(newUrl);
    },
    [searchParams, router, pathname, isHomePage, setLoading]
  );

  // Function to trigger search (called by button click or Enter key)
  const triggerSearch = useCallback(() => {
    const value = inputValue.trim();
    // Avoid redundant searches if the term hasn't changed
    if (value === urlSearchTerm) return;

    // Enable place data fetch for future searches
    if (!hasSearched) setHasSearched(true);

    sendSearchTermGA(value);

    // If the search term matches a known place, navigate to its page instead
    if (value && places.length > 0) {
      const matchedPlace = matchSearchToPlace(value, places);
      if (matchedPlace) {
        sendGoogleEvent("search_place_redirect", {
          category: "search",
          label: value,
          matched_place: matchedPlace.value,
        });
        startNavigationFeedback();
        startTransition(() => setLoading(true));
        setInputValue("");
        router.push(`/${matchedPlace.value}`);
        return;
      }
    }

    updateSearchUrl(value);
  }, [inputValue, updateSearchUrl, urlSearchTerm, places, hasSearched, setLoading, router]);

  // Sync input with URL search term when URL changes
  useEffect(() => {
    setInputValue(urlSearchTerm);
  }, [urlSearchTerm]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    // Prefetch place data on first keystroke so it's ready when user submits
    if (!hasSearched && value.length > 0) setHasSearched(true);
  }, [hasSearched]);

  const handleKeyPress = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        triggerSearch();
      }
    },
    [triggerSearch]
  );

  const clearSearchTerm = useCallback((): void => {
    setInputValue("");
    updateSearchUrl("");
  }, [updateSearchUrl]);

  const isSearchActive = Boolean(urlSearchTerm);

  return (
    <div
      className={`w-full flex justify-center border rounded-input pl-input-x transition-interactive ${isSearchActive ? "border-primary border-2" : "border-border"
        }`}
      data-testid="search-bar"
    >
      <div className="w-full flex justify-start items-center gap-element-gap rounded-input">
        {/* Decorative search icon on the left */}
        <div className="h-10 flex justify-center items-center px-button-x">
          <SearchIcon
            className={`h-5 w-5 transition-interactive ${isSearchActive ? "text-primary" : "text-foreground-strong"
              }`}
            aria-hidden="true"
          />
        </div>
        {/* Input field in the middle */}
        <input
          type="text"
          className="w-full border-0 placeholder:text-foreground/60 body-normal focus:outline-hidden"
          placeholder={t("placeholder")}
          value={inputValue}
          onKeyDown={handleKeyPress}
          onChange={handleChange}
          autoComplete="off"
          aria-label={t("search")}
          data-testid="search-input"
        />
        {/* Clear button (X) when there's text */}
        {inputValue.length > 0 && (
          <button
            type="button"
            className="flex justify-end items-center cursor-pointer px-button-x"
            onClick={clearSearchTerm}
            aria-label={t("clear")}
            data-testid="clear-search-button"
          >
            <XIcon className="h-4 w-4 text-foreground-strong" aria-hidden="true" />
          </button>
        )}
        {/* Search button on the right */}
        <button
          type="button"
          onClick={triggerSearch}
          className="h-10 flex justify-center items-center cursor-pointer px-2 bg-muted hover:bg-muted/80 active:bg-muted/60 transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-foreground-strong rounded-r-input"
          aria-label={t("search")}
          data-testid="search-button"
        >
          <ChevronRightIcon className="h-5 w-5 text-foreground-strong" />
        </button>
      </div>
    </div>
  );
}
