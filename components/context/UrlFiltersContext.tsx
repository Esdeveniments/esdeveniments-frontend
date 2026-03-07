"use client";

/**
 * Shares parsed URL filters across all consumers on the /[place] route.
 *
 * Problem: 4 components independently call `useUrlFilters()`, each subscribing
 * to `useSearchParams` and running `extractURLSegments` + `parseFiltersFromUrl`.
 * On a filter change, all 4 re-compute synchronously — ~4-8ms of duplicated
 * work per interaction (see performance-assessment-2026-03.md §8.2).
 *
 * Solution: Parse once here, share via context.  Consumers that previously
 * called `useUrlFilters(categories)` now call `useSharedUrlFilters()`.
 */

import {
  createContext,
  useContext,
  useMemo,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { extractURLSegments } from "@utils/url-parsing";
import { parseFiltersFromUrl } from "@utils/url-filters";
import type { ParsedFilters } from "types/url-filters";
import type { UrlFiltersProviderProps } from "types/props";

const UrlFiltersContext = createContext<ParsedFilters | undefined>(undefined);

/**
 * Wraps the /[place] route tree to parse URL filters once.
 * Must be inside a Suspense boundary (useSearchParams requirement).
 */
export function UrlFiltersProvider({
  children,
  categories,
}: UrlFiltersProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parsed = useMemo(() => {
    const segments = extractURLSegments(pathname || "/");
    const urlSearchParams = new URLSearchParams(searchParams?.toString() || "");
    return parseFiltersFromUrl(segments, urlSearchParams, categories);
  }, [pathname, searchParams, categories]);

  return (
    <UrlFiltersContext.Provider value={parsed}>
      {children}
    </UrlFiltersContext.Provider>
  );
}

/**
 * Consume pre-parsed URL filters from the nearest UrlFiltersProvider.
 * Throws if used outside the provider — wrap the component tree with
 * UrlFiltersProvider first (or use renderWithProviders in tests).
 */
export function useSharedUrlFilters(): ParsedFilters {
  const context = useContext(UrlFiltersContext);
  if (context === undefined) {
    throw new Error(
      "useSharedUrlFilters must be used within a UrlFiltersProvider"
    );
  }
  return context;
}
