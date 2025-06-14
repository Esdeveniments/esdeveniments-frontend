"use client";
import { useEffect, useRef } from "react";
import { initializeStore } from "@utils/initializeStore";
import type { HomeInitialState, URLFilters } from "types/common";
import { EventCategory } from "@store";

export default function HomeClient({
  initialState,
  urlFilters,
}: {
  initialState: HomeInitialState;
  urlFilters?: URLFilters;
}) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      // Merge initial state with URL filters
      const storeInitialState = {
        ...initialState,
        ...(urlFilters?.category && {
          category: urlFilters.category as EventCategory | "",
        }),
        ...(urlFilters?.date && { byDate: urlFilters.date }),
        ...(urlFilters?.distance && { distance: urlFilters.distance }),
        ...(urlFilters?.searchTerm && { searchTerm: urlFilters.searchTerm }),
      };

      initializeStore(storeInitialState);
      initialized.current = true;
    }
  }, [initialState, urlFilters]);

  // This component is now invisible - it only initializes the store
  return null;
}
