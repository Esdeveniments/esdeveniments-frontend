import EventsAroundSection from "@components/ui/eventsAround/EventsAroundSection";
import type { EventRelatedEventsProps } from "types/props";
import DetailSectionTracker from "./DetailSectionTracker";

export default function EventRelatedEvents({
  events,
  sourceEventId = "",
  sourceEventSlug,
  sourceSlugs,
}: EventRelatedEventsProps) {
  if (events.length === 0) return null;

  return (
    <DetailSectionTracker section="related_events">
      <div
        data-analytics-container="true"
        data-analytics-context="related_events"
        data-analytics-source-event-id={sourceEventId}
        data-analytics-source-event-slug={sourceEventSlug}
        data-analytics-category-slug={sourceSlugs?.categorySlug}
        data-analytics-place-slug={sourceSlugs?.placeSlug}
      >
        <EventsAroundSection
          events={events}
          bleed
          analyticsEventName="related_event_click"
          analyticsListName="related_events"
          analyticsContext={sourceSlugs}
        />
      </div>
    </DetailSectionTracker>
  );
}
