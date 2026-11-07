"use client";

import {
  useCallback,
  useState,
  startTransition,
  ChangeEvent,
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
import {
  markTextSearchSubmitted,
  sendGoogleEvent,
  sendPlaceRedirectGA,
  toSearchTermParam,
} from "@utils/analytics";
import { placeForSearch } from "@utils/search-query";
import { startNavigationFeedback } from "@lib/navigation-feedback";
import { useFilterLoading } from "@components/context/FilterLoadingContext";
import { useSearchCombobox } from "@components/hooks/useSearchCombobox";
import { useSearchPlaces } from "@components/hooks/useSearchPlaces";
import SearchSuggestions from "./SearchSuggestionsLazy";
import type { SearchBoxSuggestion } from "types/search";

const sendSearchTermGA = (searchTerm: string): void => {
  if (searchTerm && searchTerm.length > 0) {
    sendGoogleEvent("search", {
      context: "search",
      search_term: toSearchTermParam(searchTerm),
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

  // Get current search term from URL
  const urlSearchTerm = searchParams?.get("search") || "";

  const [inputValue, setInputValue] = useState<string>(urlSearchTerm);

  // Places for the exact place-name redirect (SWR-cached 24 h, loaded once
  // there is text, shared with the suggestions).
  const places = useSearchPlaces(inputValue.trim().length > 0);

  // Sync input with URL search term when URL changes
  // (react.dev: "Adjusting some state when a prop changes").
  const [prevUrlSearchTerm, setPrevUrlSearchTerm] = useState(urlSearchTerm);
  if (urlSearchTerm !== prevUrlSearchTerm) {
    setPrevUrlSearchTerm(urlSearchTerm);
    setInputValue(urlSearchTerm);
  }

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

  // Search button, Enter, or a picked suggestion. Without one, a typed place
  // name opens its page; anything else is a text search.
  const triggerSearch = useCallback((suggestion?: SearchBoxSuggestion) => {
    const value = inputValue.trim();
    // Avoid redundant searches if the term hasn't changed
    if (suggestion?.type !== "place" && value === urlSearchTerm) return;

    sendSearchTermGA(value);

    const matchedPlace = placeForSearch(value, places, suggestion);
    if (matchedPlace) {
      if (!suggestion) sendPlaceRedirectGA("search", value, matchedPlace.value);
      startNavigationFeedback();
      startTransition(() => setLoading(true));
      setInputValue("");
      router.push(`/${matchedPlace.value}`);
      return;
    }

    markTextSearchSubmitted("search", value);
    updateSearchUrl(value);
  }, [inputValue, updateSearchUrl, urlSearchTerm, places, setLoading, router]);

  const submitSearch = useCallback(() => triggerSearch(), [triggerSearch]);

  const { anchorRef, submit, inputProps, popupProps } = useSearchCombobox({
    value: inputValue,
    setValue: setInputValue,
    context: "search",
    onSubmit: submitSearch,
    onSelect: triggerSearch,
  });

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const clearSearchTerm = useCallback((): void => {
    setInputValue("");
    updateSearchUrl("");
  }, [updateSearchUrl]);

  const isSearchActive = Boolean(urlSearchTerm);

  return (
    <div
      ref={anchorRef}
      className={`w-full flex justify-center border rounded-input pl-input-x transition-interactive ${isSearchActive ? "border-primary border-2" : "border-input"
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
          className="w-full border-0 placeholder:text-muted-foreground body-normal focus:outline-none"
          placeholder={t("placeholder")}
          value={inputValue}
          {...inputProps}
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
          onClick={submit}
          className="h-10 flex justify-center items-center cursor-pointer px-2 bg-muted hover:bg-muted/80 active:bg-muted/60 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foreground-strong rounded-r-input"
          aria-label={t("search")}
          data-testid="search-button"
        >
          <ChevronRightIcon className="h-5 w-5 text-foreground-strong" />
        </button>
      </div>
      {popupProps && <SearchSuggestions {...popupProps} />}
    </div>
  );
}
