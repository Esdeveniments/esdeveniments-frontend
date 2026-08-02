"use client";

import { useEffect, useRef } from "react";
import { sendGoogleEvent } from "@utils/analytics";

/**
 * Fires a `favorites_page_view` event once when the favorites page loads.
 * Must be placed inside the favorites page component tree. Reused on both
 * /preferits (period "active", default) and /preferits/passats (period
 * "past") so the two tabs don't need near-duplicate tracker components.
 */
export default function FavoritesPageTracker({
  favoritesCount,
  activeCount,
  period = "active",
}: {
  favoritesCount: number;
  activeCount: number;
  period?: "active" | "past";
}) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!hasTrackedRef.current) {
      sendGoogleEvent("favorites_page_view", {
        favorites_count: favoritesCount,
        active_count: activeCount,
        period,
      });
      hasTrackedRef.current = true;
    }
  }, [favoritesCount, activeCount, period]);

  return null;
}
