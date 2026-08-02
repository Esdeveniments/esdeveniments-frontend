"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@components/hooks/useAuth";
import { sendGoogleEvent } from "@utils/analytics";

/**
 * Fires a `profile_page_view` event once when a profile page loads. Reused
 * on /perfil/[username] (status "upcoming") and /perfil/[username]/passats
 * (status "past") — mirrors FavoritesPageTracker's `period` prop, avoiding a
 * near-duplicate tracker component per tab.
 */
export default function ProfilePageTracker({
  username,
  upcomingCount,
  pastCount,
  status,
}: {
  username: string;
  upcomingCount: number | undefined;
  pastCount: number | undefined;
  status: "upcoming" | "past";
}) {
  const { user, isLoading } = useAuth();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    // Wait for auth to resolve so `is_own_profile` isn't always false on the
    // owner's first render (AuthProvider hydrates asynchronously).
    if (hasTrackedRef.current || isLoading) return;

    sendGoogleEvent("profile_page_view", {
      is_own_profile: user?.username === username,
      upcoming_count: upcomingCount ?? null,
      past_count: pastCount ?? null,
      status,
    });
    hasTrackedRef.current = true;
  }, [username, upcomingCount, pastCount, status, user, isLoading]);

  return null;
}
