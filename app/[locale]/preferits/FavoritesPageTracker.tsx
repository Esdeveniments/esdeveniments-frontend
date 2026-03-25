"use client";

import { useEffect, useRef } from "react";
import { sendGoogleEvent } from "@utils/analytics";

/**
 * Fires a `favorites_page_view` event once when the favorites page loads.
 * Must be placed inside the favorites page component tree.
 */
export default function FavoritesPageTracker({
  favoritesCount,
  activeCount,
}: {
  favoritesCount: number;
  activeCount: number;
}) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!hasTrackedRef.current) {
      sendGoogleEvent("favorites_page_view", {
        favorites_count: favoritesCount,
        active_count: activeCount,
      });
      hasTrackedRef.current = true;
    }
  }, [favoritesCount, activeCount]);

  return null;
}
