import { useEffect, useRef } from "react";
import { sendGoogleEvent, ensureGtag } from "@utils/analytics";
import type { EventClientProps } from "types/props";

// Fires `view_event_page` once per event render. Extracted from EventClient
// so the event-detail page's analytics logic lives in one place, the same
// way FavoritesPageTracker/ProfilePageTracker own their pages' tracking.
export function useEventAnalytics(event: EventClientProps["event"]): void {
  // Tracks the last event.id we fired for, not a plain boolean: Next.js
  // App Router doesn't remount this component on a dynamic-segment change
  // (e.g. client-side nav to a different /e/[eventId]), so a one-shot
  // boolean would silently stop tracking after the first event.
  const trackedEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Guards against React Strict Mode's dev-only double-invoke, same as
    // ProfilePageTracker/FavoritesPageTracker.
    if (trackedEventIdRef.current === event.id) return;

    const isPast = event.endDate ? new Date(event.endDate) < new Date() : false;

    ensureGtag();
    sendGoogleEvent("view_event_page", {
      event_id: event.id,
      event_slug: event.slug ?? "",
      category_slug: event.categorySlug ?? "",
      place_slug: event.placeSlug ?? "",
      has_image: event.hasImage,
      is_past: isPast,
      origin: event.origin,
    });
    trackedEventIdRef.current = event.id;
  }, [
    event.categorySlug,
    event.endDate,
    event.hasImage,
    event.id,
    event.origin,
    event.placeSlug,
    event.slug,
  ]);
}
