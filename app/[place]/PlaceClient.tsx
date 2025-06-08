"use client";

import { initializeStore } from "@utils/initializeStore";
import { useEffect } from "react";
import useStore from "@store";
import type { PlaceClientProps } from "types/props";

export default function PlaceClient({ initialState }: PlaceClientProps) {
  const {
    setHydrated,
    place: currentPlace,
    resetPagination,
  } = useStore((state) => ({
    setHydrated: state.setHydrated,
    place: state.place,
    resetPagination: state.resetPagination,
  }));

  useEffect(() => {
    // Mark as hydrated first
    setHydrated();

    // Check if place changed and reset pagination if needed
    const newPlace = initialState.place;
    if (currentPlace && newPlace && currentPlace !== newPlace) {
      resetPagination();
    }

    // Initialize store with fresh server data
    initializeStore(initialState);
  }, [initialState, setHydrated, currentPlace, resetPagination]);

  // This component is now invisible - it only initializes the store
  return null;
}
