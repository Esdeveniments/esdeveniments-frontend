"use client";

import { memo, ReactElement, useMemo } from "react";
import List from "components/ui/primitives/list";
import { Card } from "@components/ui/primitives";
import LoadMoreButton from "components/ui/primitives/loadMoreButton";
import { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { useEvents } from "@components/hooks/useEvents";
import { HybridEventsListProps } from "types/props";

// Client side enhancer: handles pagination & de-duplication.
// Expects initialEvents to be the SSR list (may include ad markers). We pass only
// the real events (without ads) to the SWR fallbackData so SWR logic operates on
// real items only. SSR markup (with ads) remains untouched until new pages arrive.

function HybridEventsListClient({
  initialEvents,
  place,
  category,
  date,
  serverHasMore = false,
}: HybridEventsListProps): ReactElement | null {
  const realInitialEvents = useMemo(
    () =>
      initialEvents
        .filter((e) => !("isAd" in e && e.isAd))
        .filter(isEventSummaryResponseDTO) as EventSummaryResponseDTO[],
    [initialEvents],
  );

  const { events, hasMore, loadMore, isLoading, isValidating, error } =
    useEvents({
      place,
      category,
      date,
      initialSize: 10,
      fallbackData: realInitialEvents,
      serverHasMore,
    });

  const mergedEvents: ListEvent[] = useMemo(() => {
    if (!events || events.length === 0) return initialEvents; // nothing new yet

    // Build a Set of existing real event ids from SSR to prevent duplication
    const seen = new Set<string>(realInitialEvents.map((e) => e.id));
    const uniqueAppended: EventSummaryResponseDTO[] = [];
    for (const e of events) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      uniqueAppended.push(e);
    }
    return initialEvents.concat(uniqueAppended);
  }, [events, initialEvents, realInitialEvents]);

  if (error) {
    console.error("Events loading error:", error);
  }

  return (
    <>
      <List events={mergedEvents}>
        {(event: ListEvent, index: number) => {
          if ("isAd" in event && event.isAd) {
            return <Card key={`${event.id ?? "ad"}-${index}`} type="ad" />;
          }
          return (
            <Card
              key={`${event.id ?? "ad"}-${index}`}
              type="event-vertical"
              event={event as EventSummaryResponseDTO}
              isPriority={index === 0}
            />
          );
        }}
      </List>
      <LoadMoreButton
        onLoadMore={loadMore}
        isLoading={isLoading}
        isValidating={isValidating}
        hasMore={hasMore}
      />
    </>
  );
}

export default memo(HybridEventsListClient);
