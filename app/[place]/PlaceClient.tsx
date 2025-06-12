"use client";

import { useEffect } from "react";
import useStore from "@store";

export default function PlaceClient() {
  const { setHydrated, resetPagination } = useStore((state) => ({
    setHydrated: state.setHydrated,
    resetPagination: state.resetPagination,
  }));

  useEffect(() => {
    // Mark as hydrated first
    setHydrated();

    // Reset pagination for fresh page loads
    resetPagination();

    // No filter state initialization needed - filters live in URL only
  }, [setHydrated, resetPagination]);

  // This component is now invisible - it only initializes hydration
  return null;
}
