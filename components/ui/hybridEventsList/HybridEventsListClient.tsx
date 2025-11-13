"use client";

import { memo, ReactElement, useMemo, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import List from "@components/ui/list";
import Card from "@components/ui/card";
import LoadMoreButton from "@components/ui/loadMoreButton";
import CardLoading from "@components/ui/cardLoading";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { useEvents } from "@components/hooks/useEvents";
import { HybridEventsListProps } from "types/props";
import { parseFiltersFromUrl } from "@utils/url-filters";
import { extractURLSegments } from "@utils/url-parsing";
import { computeTemporalStatus } from "@utils/event-status";

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
  pageData,
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

  // Check if client-side filters are active
  const hasClientFilters = !!(search || distance || lat || lon);

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

  // When filters are active, show ALL filtered events (replace SSR list)
  // When no filters, show only appended events (SSR list remains visible)
  // Filter out past events in both cases
  const displayedEvents: ListEvent[] = useMemo(() => {
    if (!events || events.length === 0) return [];

    // Filter out past events
    const activeEvents = events.filter((event) => {
      if (!isEventSummaryResponseDTO(event)) return true; // Keep ads
      const status = computeTemporalStatus(
        event.startDate,
        event.endDate,
        undefined,
        event.startTime,
        event.endTime
      );
      return status.state !== "past";
    });

    if (hasClientFilters) {
      // Filters active: show all filtered events (replace SSR list)
      return activeEvents;
    }

    // No filters: only show appended events beyond SSR list
    const seen = new Set<string>(realInitialEvents.map((e) => e.id));
    const uniqueAppended: EventSummaryResponseDTO[] = [];
    for (const e of activeEvents) {
      if (!isEventSummaryResponseDTO(e)) continue; // Skip ads in appended list
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      uniqueAppended.push(e);
    }
    return uniqueAppended;
  }, [events, realInitialEvents, hasClientFilters]);

  // Log errors for debugging
  if (error) {
    console.error("Events loading error:", error);
  }

  // Show error state when there's an error and filters are active
  const showErrorState =
    error && hasClientFilters && !isLoading && !isValidating;

  // Show loading state when filters are active and events are being fetched
  const showLoadingState =
    hasClientFilters &&
    (isLoading || isValidating) &&
    displayedEvents.length === 0 &&
    !error;

  // Show no events found when filters are active, fetch completed, and no results
  const showNoEventsFound =
    hasClientFilters &&
    !isLoading &&
    !isValidating &&
    displayedEvents.length === 0 &&
    !error;

  // Show fallback events when filters return no results but we have initial events
  // (initialEvents may contain region or latest events as fallback from server)
  const showFallbackEvents = showNoEventsFound && realInitialEvents.length > 0;

  return (
    <>
      {showErrorState ? (
        // Show error message when events fail to load
        <div className="w-full flex flex-col items-center gap-element-gap py-section-y px-section-x">
          <div className="w-full text-center">
            <p className="body-normal text-foreground-strong mb-element-gap">
              Error al carregar esdeveniments
            </p>
            <p className="body-small text-foreground/80">
              Si us plau, torna-ho a intentar més tard.
            </p>
          </div>
        </div>
      ) : showLoadingState ? (
        // Show skeleton loading cards matching the event card layout
        <div className="w-full">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardLoading key={`loading-${index}`} />
          ))}
        </div>
      ) : showNoEventsFound ? (
        // Show no events found message when filters return no results
        <>
          <NoEventsFound title={pageData?.notFoundText} />
          {showFallbackEvents && (
            <div className="w-full mt-section-y">
              <List events={realInitialEvents}>
                {(event: ListEvent, index: number) => (
                  <Card
                    key={`${event.id ?? "ad"}-${index}`}
                    event={event}
                    isPriority={index === 0}
                  />
                )}
              </List>
            </div>
          )}
        </>
      ) : (
        <>
          <List events={displayedEvents}>
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
      )}
    </>
  );
}

function HybridEventsListClient(
  props: HybridEventsListProps
): ReactElement | null {
  return (
    <Suspense fallback={null}>
      <HybridEventsListClientContent {...props} />
    </Suspense>
  );
}

export default memo(HybridEventsListClient);
