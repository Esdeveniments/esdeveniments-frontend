import EventCardList from "@components/ui/card/EventCardList";
import NoEventsFound from "@components/ui/common/noEventsFound";
import type { EventSummaryResponseDTO } from "types/api/event";

// Presentational half of ProfileEventsSection/FavoritesEventsSection: given
// already-fetched events, render the list or an empty state. Both callers
// fetch from different sources (profile events vs. favourite events) but
// share this exact rendering shape. Both pages render it right under their
// <h1>, so card titles are h2.
export default function EventsSection({
  events,
  emptyTitle,
  sectionLabel,
  testId,
  initialIsFavorite = false,
}: {
  events: EventSummaryResponseDTO[];
  emptyTitle: string;
  sectionLabel: string;
  testId: string;
  initialIsFavorite?: boolean;
}) {
  return (
    <section aria-label={sectionLabel} data-testid={testId}>
      {events.length === 0 ? (
        <NoEventsFound title={emptyTitle} />
      ) : (
        <EventCardList
          events={events}
          initialIsFavorite={initialIsFavorite}
          headingLevel="h2"
        />
      )}
    </section>
  );
}
