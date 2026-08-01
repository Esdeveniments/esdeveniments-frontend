import List from "@components/ui/list";
import CardServer from "@components/ui/card/CardServer";
import NoEventsFound from "@components/ui/common/noEventsFound";
import type { EventSummaryResponseDTO } from "types/api/event";

// Presentational half of ProfileEventsSection/FavoritesEventsSection: given
// already-fetched events, render the list or an empty state. Both callers
// fetch from different sources (profile events vs. favourite events) but
// share this exact rendering shape.
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
        <List events={events}>
          {(event, index) => (
            <CardServer
              key={`${event.id}-${index}`}
              event={event}
              isPriority={index === 0}
              initialIsFavorite={initialIsFavorite}
            />
          )}
        </List>
      )}
    </section>
  );
}
