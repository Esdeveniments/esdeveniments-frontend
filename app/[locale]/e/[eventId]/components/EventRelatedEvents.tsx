import EventsAroundSection from "@components/ui/eventsAround/EventsAroundSection";
import type { EventRelatedEventsProps } from "types/props";
import DetailSectionTracker from "./DetailSectionTracker";

export default function EventRelatedEvents({
  events,
  sourceEventId = "",
  sourceEventSlug,
}: EventRelatedEventsProps) {
  if (events.length === 0) return null;

  return (
    <DetailSectionTracker section="related_events">
      <div
        data-analytics-container="true"
        data-analytics-context="related_events"
        data-analytics-source-event-id={sourceEventId}
        data-analytics-source-event-slug={sourceEventSlug}
      >
        <EventsAroundSection events={events} bleed />
      </div>
    </DetailSectionTracker>
  );
}
