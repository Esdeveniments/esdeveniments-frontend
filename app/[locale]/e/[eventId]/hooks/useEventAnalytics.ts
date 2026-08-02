import { useEffect } from "react";
import { sendGoogleEvent } from "@utils/analytics";
import type { EventClientProps } from "types/props";

// Fires `view_event_page` once per event render. Extracted from EventClient
// so the event-detail page's analytics logic lives in one place, the same
// way FavoritesPageTracker/ProfilePageTracker own their pages' tracking.
export function useEventAnalytics(event: EventClientProps["event"]): void {
  useEffect(() => {
    const isPast = event.endDate ? new Date(event.endDate) < new Date() : false;

    sendGoogleEvent("view_event_page", {
      event_id: event.id,
      event_slug: event.slug ?? "",
      category_slug: event.categorySlug ?? "",
      place_slug: event.placeSlug ?? "",
      has_image: event.hasImage,
      is_past: isPast,
      origin: event.origin,
    });
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
