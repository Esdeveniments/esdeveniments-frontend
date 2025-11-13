"use client";

import {
  useCallback,
  useEffect,
  useState,
  ChangeEvent,
  KeyboardEvent,
  JSX,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import XIcon from "@heroicons/react/solid/XIcon";
import SearchIcon from "@heroicons/react/solid/SearchIcon";
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import { sendGoogleEvent } from "@utils/analytics";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isHomePage = pathname === "/";

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

      // Build new URL preserving current path structure
      const queryString = params.toString();
      const newUrl = queryString
        ? `${isHomePage ? "/catalunya/" : pathname}?${queryString}`
        : isHomePage
        ? "/catalunya/"
        : pathname || "/";

      router.push(newUrl);
    },
    [searchParams, router, pathname, isHomePage]
  );

  // Function to trigger search (called by button click or Enter key)
  const triggerSearch = useCallback(() => {
    const value = inputValue.trim();
    sendSearchTermGA(value);
    updateSearchUrl(value);
  }, [inputValue, updateSearchUrl]);

  // Sync input with URL search term when URL changes
  useEffect(() => {
    setInputValue(urlSearchTerm);
  }, [urlSearchTerm]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    // No auto-search - user must click button or press Enter
  }, []);

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

  return (
    <div
      className="w-full flex justify-center border border-border rounded-input pl-input-x mt-element-gap"
      data-testid="search-bar"
    >
      <div className="w-full flex justify-start items-center gap-element-gap rounded-input">
        {/* Decorative search icon on the left */}
        <div className="h-10 flex justify-center items-center px-button-x">
          <SearchIcon
            className="h-5 w-5 text-foreground-strong"
            aria-hidden="true"
          />
        </div>
        {/* Input field in the middle */}
        <input
          type="text"
          className="w-full border-0 placeholder:text-foreground/60 body-normal focus:outline-none"
          placeholder="Què estàs buscant?"
          value={inputValue}
          onKeyDown={handleKeyPress}
          onChange={handleChange}
          autoComplete="off"
          aria-label="Search input"
          data-testid="search-input"
        />
        {/* Clear button (X) when there's text */}
        {inputValue.length > 0 && (
          <div className="flex justify-end items-center cursor-pointer px-button-x">
            <XIcon
              className="h-4 w-4 text-foreground-strong"
              onClick={clearSearchTerm}
              aria-label="Clear search"
            />
          </div>
        )}
        {/* Search button on the right */}
        <button
          type="button"
          onClick={triggerSearch}
          className="h-10 flex justify-center items-center cursor-pointer px-2 bg-muted hover:bg-muted/80 active:bg-muted/60 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foreground-strong rounded-r-input"
          aria-label="Search"
          data-testid="search-button"
        >
          <ChevronRightIcon className="h-5 w-5 text-foreground-strong" />
        </button>
      </div>
    </div>
  );
}
