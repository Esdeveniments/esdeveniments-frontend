"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import AddToCalendar from "@components/ui/addToCalendar";
import useTrackedCta from "@components/hooks/useTrackedCta";
import { sendGoogleEvent } from "@utils/analytics";
import type { EventActionBarActionsProps } from "types/props";

/** "Més info" is the filled main action; without a website the calendar takes its place. */
export default function EventActionBarActions({
  eventSlug,
  eventUrl,
  moreInfoLabel,
  calendar,
}: EventActionBarActionsProps) {
  const { ref, trackClick } = useTrackedCta<HTMLDivElement>("sticky_cta");
  const track = (action: "more_info" | "add_to_calendar") => {
    trackClick();
    sendGoogleEvent("sticky_cta_click", { action, event_slug: eventSlug });
  };

  return (
    <div ref={ref} className="relative flex flex-shrink-0 items-center gap-2">
      <AddToCalendar
        {...calendar}
        variant={eventUrl ? "outline" : "primary"}
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
          onClick={() => track("more_info")}
        >
          {moreInfoLabel}
          <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
