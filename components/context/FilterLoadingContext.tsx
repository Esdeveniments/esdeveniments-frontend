"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
  useMemo,
  startTransition,
} from "react";
import { useSearchParams, usePathname } from "next/navigation";
import type { FilterLoadingContextValue } from "types/props";

const FilterLoadingContext =
  createContext<FilterLoadingContextValue | undefined>(undefined);

export function FilterLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // Track both pathname and search params so that date changes (path segment)
  // also reset the loading state — not only query-param changes.
  const urlKey = useMemo(
    () => `${pathname}?${searchParams.toString()}`,
    [pathname, searchParams],
  );
  const previousUrlKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const previousUrlKey = previousUrlKeyRef.current;

    if (previousUrlKey === null) {
      previousUrlKeyRef.current = urlKey;
      return;
    }

    if (previousUrlKey !== urlKey) {
      startTransition(() => setIsLoading(false));
      previousUrlKeyRef.current = urlKey;
    }
  }, [urlKey]);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return (
    <FilterLoadingContext.Provider value={{ isLoading, setLoading }}>
      {children}
    </FilterLoadingContext.Provider>
  );
}

export function useFilterLoading() {
  const context = useContext(FilterLoadingContext);
  if (context === undefined) {
    throw new Error(
      "useFilterLoading must be used within a FilterLoadingProvider"
    );
  }
  return context;
}
