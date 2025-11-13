"use client";

import { memo, ReactElement, useMemo, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import List from "@components/ui/list";
import Card from "@components/ui/card";
import LoadMoreButton from "@components/ui/loadMoreButton";
import { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { useEvents } from "@components/hooks/useEvents";
import { HybridEventsListProps } from "types/props";
import { parseFiltersFromUrl } from "@utils/url-filters";
import { extractURLSegments } from "@utils/url-parsing";

// Client side enhancer: handles pagination & de-duplication.
// Expects initialEvents to be the SSR list (may include ad markers). We pass only
// the real events (without ads) to the SWR fallbackData so SWR logic operates on
// real items only. SSR markup (with ads) remains untouched until new pages arrive.

// Extract filter parsing into a separate component to handle Suspense
function HybridEventsListClientContent({
  initialEvents,
  place,
  category,
  date,
  serverHasMore = false,
  categories = [],
}: HybridEventsListProps): ReactElement | null {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Parse URL to extract client-side filters (search, distance, lat, lon)
  const urlSegments = extractURLSegments(pathname || "/");
  const urlSearchParams = new URLSearchParams(searchParams?.toString() || "");
  const parsed = parseFiltersFromUrl(urlSegments, urlSearchParams, categories);

  const search = parsed.queryParams.search;
  const distance = parsed.queryParams.distance;
  const lat = parsed.queryParams.lat;
  const lon = parsed.queryParams.lon;

  const realInitialEvents = useMemo(() => {
    return initialEvents.filter(isEventSummaryResponseDTO);
  }, [initialEvents]);

  const { events, hasMore, loadMore, isLoading, isValidating, error } =
    useEvents({
      place,
      category,
      date,
      search,
      distance,
      lat,
      lon,
      initialSize: 10,
      fallbackData: realInitialEvents,
      serverHasMore,
    });

  const appendedEvents: ListEvent[] = useMemo(() => {
    if (!events || events.length === 0) return [];

    // Build a Set of existing real event ids from SSR to prevent duplication
    const seen = new Set<string>(realInitialEvents.map((e) => e.id));
    const uniqueAppended: EventSummaryResponseDTO[] = [];
    for (const e of events) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      uniqueAppended.push(e);
    }
    // Only render items beyond SSR list; SSR list remains visible above
    return uniqueAppended;
  }, [events, realInitialEvents]);

  if (error) {
    console.error("Events loading error:", error);
  }

  return (
    <>
      <List events={appendedEvents}>
        {(event: ListEvent, index: number) => (
          <Card
            key={`${event.id ?? "ad"}-${index}`}
            event={event}
            isPriority={index === 0}
          />
        )}
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

function HybridEventsListClient(props: HybridEventsListProps): ReactElement | null {
  return (
    <Suspense fallback={null}>
      <HybridEventsListClientContent {...props} />
    </Suspense>
  );
}

export default memo(HybridEventsListClient);
