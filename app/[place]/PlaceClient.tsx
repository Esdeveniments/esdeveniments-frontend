"use client";

import Events from "@components/ui/events";
import { initializeStore } from "@utils/initializeStore";
import { useEffect } from "react";
import type { PlaceProps, PageData, PlaceTypeAndLabel } from "types/common";

interface PlaceClientProps extends PlaceProps {
  pageData: PageData;
  placeTypeLabel: PlaceTypeAndLabel;
}

export default function PlaceClient({
  initialState,
  placeTypeLabel,
  pageData,
}: PlaceClientProps) {
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
