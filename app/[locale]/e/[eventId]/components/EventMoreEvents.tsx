import EventPagePromotedEvents from "@components/ui/promotedEvents/EventPagePromotedEvents";
import { fetchPromotedEvents } from "@lib/api/promotions";
import { mergePromotedEvents } from "@utils/promoted-events";
import type { EventMoreEventsProps } from "types/props";
import EventRelatedEvents from "./EventRelatedEvents";

const MAX_PROMOTED_ON_EVENT_PAGE = 8;

/**
 * Promoted events near the event (its town's first, then the comarca's), then
 * the related events that aren't already promoted, so no event is listed twice.
 * Request-time: the page shows the plain related row as the Suspense fallback,
 * so related links are in the first HTML and the row keeps its height.
 */
export default async function EventMoreEvents({
  eventId,
  cityId,
  citySlug,
  regionId,
  relatedEvents,
  sourceEventSlug,
}: EventMoreEventsProps) {
  const [inTown, inRegion] = await Promise.all([
    cityId ? fetchPromotedEvents({ placement: "CITY", cityId }) : [],
    regionId ? fetchPromotedEvents({ placement: "REGION", regionId }) : [],
  ]);
  const promoted = mergePromotedEvents(
    [inTown, inRegion],
    eventId,
    MAX_PROMOTED_ON_EVENT_PAGE,
  );
  const promotedIds = new Set(promoted.map((event) => event.id));

  return (
    <>
      <EventPagePromotedEvents events={promoted} citySlug={citySlug} />
      <EventRelatedEvents
        events={relatedEvents.filter((event) => !promotedIds.has(event.id))}
        sourceEventId={eventId}
        sourceEventSlug={sourceEventSlug}
      />
    </>
  );
}
