"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import AddToCalendar from "@components/ui/addToCalendar";
import useTrackedCta from "@components/hooks/useTrackedCta";
import { sendGoogleEvent } from "@utils/analytics";
import type { EventActionBarActionsProps } from "types/props";

/** "Més info" is the filled main action; without a website the calendar takes its place. */
export default function EventActionBarActions({
  eventId,
  eventSlug,
  categorySlug,
  placeSlug,
  eventUrl,
  moreInfoLabel,
  calendar,
}: EventActionBarActionsProps) {
  const { ref, trackClick } = useTrackedCta<HTMLDivElement>("sticky_cta");
  const track = (action: "more_info" | "add_to_calendar") => {
    trackClick();
    sendGoogleEvent("sticky_cta_click", {
      action,
      event_slug: eventSlug,
      ...(eventId ? { event_id: eventId } : {}),
      ...(categorySlug ? { category_slug: categorySlug } : {}),
      ...(placeSlug ? { place_slug: placeSlug } : {}),
    });
  };

  return (
    <div ref={ref} className="relative flex flex-shrink-0 items-center gap-2">
      <AddToCalendar
        calendar={calendar}
        variant={eventUrl ? "neutral" : "primary"}
        iconOnly={Boolean(eventUrl)}
        shortLabel
        placement="above-end"
        source="sticky_cta"
        onOpen={() => track("add_to_calendar")}
      />
      {eventUrl && (
        <a
          href={eventUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary whitespace-nowrap"
          data-analytics-link-type="sticky_cta_more_info"
          data-analytics-context="sticky_cta"
          data-analytics-event-id={eventId || ""}
          data-analytics-event-slug={eventSlug || ""}
          data-analytics-category-slug={categorySlug || undefined}
          data-analytics-place-slug={placeSlug || undefined}
          onClick={() => track("more_info")}
        >
          {moreInfoLabel}
          <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
