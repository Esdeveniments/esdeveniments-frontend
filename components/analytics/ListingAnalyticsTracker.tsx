"use client";

import { useCallback, useState } from "react";
import useListingAnalytics from "@components/hooks/useListingAnalytics";
import type { ListingAnalyticsTrackerProps } from "types/props";

/**
 * Attaches `useListingAnalytics` to the enclosing `[data-analytics-container]`
 * when `HybridEventsListClient` is not mounted (fallback listings on empty towns).
 */
export default function ListingAnalyticsTracker({
  place,
  category,
  date,
}: ListingAnalyticsTrackerProps) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const attachRef = useCallback((el: HTMLSpanElement | null) => {
    setRoot(el?.closest<HTMLElement>('[data-analytics-container="true"]') ?? null);
  }, []);

  useListingAnalytics(root, {
    place: place || undefined,
    category: category || undefined,
    date: date || undefined,
  });

  return <span ref={attachRef} hidden aria-hidden="true" />;
}
