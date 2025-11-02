"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  ChangeEvent,
  KeyboardEvent,
  JSX,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import XIcon from "@heroicons/react/solid/XIcon";
import SearchIcon from "@heroicons/react/solid/SearchIcon";
import { sendGoogleEvent } from "@utils/analytics";

// eslint-disable-next-line no-unused-vars
function debounce(
  // eslint-disable-next-line no-unused-vars
  func: (_value: string) => void,
  wait: number,
  immediate = false
  // eslint-disable-next-line no-unused-vars
): (_value: string) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function executedFunction(value: string) {
    const later = () => {
      timeout = null;
      if (!immediate) func(value);
    };
    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(value);
  };
}

const sendSearchTermGA = (searchTerm: string): void => {
  sendGoogleEvent("search", {
    category: "search",
    label: searchTerm,
    search_term: searchTerm,
    value: searchTerm,
  });
};

export default function Search(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  // Get current search term from URL (not Zustand)
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

  // Debounce URL update only (no more Zustand)
  const debouncedUpdateUrl = useMemo(
    () =>
      debounce((value: string) => {
        updateSearchUrl(value);
      }, 1500),
    [updateSearchUrl]
  );

  const searchEvents = useCallback((term: string): void => {
    if (term && term.length > 0) {
      sendSearchTermGA(term);
    }
  }, []);

  // Sync input with URL search term when URL changes
  useEffect(() => {
    setInputValue(urlSearchTerm);
  }, [urlSearchTerm]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      debouncedUpdateUrl(value);
      sendSearchTermGA(value);
    },
    [debouncedUpdateUrl]
  );

  const handleKeyPress = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const value = e.currentTarget.value;
        sendSearchTermGA(value);
        updateSearchUrl(value);
      }
    },
    [updateSearchUrl]
  );

  const clearSearchTerm = useCallback((): void => {
    setInputValue("");
    updateSearchUrl("");
  }, [updateSearchUrl]);

  return (
    <div
      className="w-full flex justify-center border border-border rounded-input px-input-x mt-element-gap"
      data-testid="search-bar"
    >
      <div className="w-full flex justify-start items-center gap-element-gap rounded-input">
        <div className="h-10 flex justify-end items-center cursor-pointer px-button-x">
          <SearchIcon
            className="h-5 w-5 text-foreground-strong"
            onClick={() => searchEvents(urlSearchTerm)}
            aria-label="Search"
          />
        </div>
        <input
          type="text"
          className="w-full border-0 placeholder:text-foreground/60 text-[16px] rounded-tr-input rounded-br-input focus:outline-none"
          placeholder="Què estàs buscant?"
          value={inputValue}
          onKeyDown={handleKeyPress}
          onChange={handleChange}
          autoComplete="off"
          aria-label="Search input"
          data-testid="search-input"
        />
        {inputValue.length > 0 && (
          <div className="flex justify-end items-center cursor-pointer px-button-x">
            <XIcon
              className="h-4 w-4 text-foreground-strong"
              onClick={clearSearchTerm}
              aria-label="Clear search"
            />
          </div>
        )}
      </div>
    </div>
  );
}
