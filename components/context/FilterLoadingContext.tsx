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
import { useSearchParams } from "next/navigation";
import type { FilterLoadingContextValue } from "types/props";

const FilterLoadingContext =
  createContext<FilterLoadingContextValue | undefined>(undefined);

export function FilterLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const searchKey = useMemo(() => searchParams.toString(), [searchParams]);
  const previousSearchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const previousSearchKey = previousSearchKeyRef.current;

    if (previousSearchKey === null) {
      previousSearchKeyRef.current = searchKey;
      return;
    }

    if (previousSearchKey !== searchKey) {
      startTransition(() => setIsLoading(false));
      previousSearchKeyRef.current = searchKey;
    }
  }, [searchKey]);

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
