"use client";

import Events from "@components/ui/events";
import { ByDateClientProps } from "types/props";
import { initializeStore } from "@utils/initializeStore";
import { useEffect } from "react";

export default function ByDateClient({
  initialState,
  placeTypeLabel,
  pageData,
}: ByDateClientProps) {
  useEffect(() => {
    initializeStore(initialState);
  }, [initialState]);

  return (
    <Events
      events={initialState.events || []}
      hasServerFilters={initialState.hasServerFilters}
      placeTypeLabel={placeTypeLabel}
      pageData={pageData}
    />
  );
}
