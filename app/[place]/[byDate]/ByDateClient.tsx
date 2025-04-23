"use client";

import Events from "@components/ui/events";
import { initializeStore } from "@utils/initializeStore";
import { useEffect } from "react";
import type { ByDateProps, PageData, PlaceTypeAndLabel } from "types/common";

interface ByDateClientProps extends ByDateProps {
  pageData: PageData;
  placeTypeLabel: PlaceTypeAndLabel;
}

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
