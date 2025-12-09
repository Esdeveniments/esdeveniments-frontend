"use client";

import { memo, ReactElement, useMemo, Suspense } from "react";
import List from "@components/ui/list";
import Card from "@components/ui/card";
import LoadMoreButton from "@components/ui/loadMoreButton";
import CardLoading from "@components/ui/cardLoading";
import NoEventsFound from "@components/ui/common/noEventsFound/NoEventsFoundClient";
import { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { useEvents } from "@components/hooks/useEvents";
import { HybridEventsListClientProps } from "types/props";
import { appendSearchQuery } from "@utils/notFoundMessaging";
import { useUrlFilters } from "@components/hooks/useUrlFilters";
import { useTranslations } from "next-intl";

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
}: HybridEventsListClientProps): ReactElement | null {
  const parsed = useUrlFilters(categories);
  const t = useTranslations("Components.HybridEventsListClient");

  const search = parsed.queryParams.search;
  const distance = parsed.queryParams.distance;
  const lat = parsed.queryParams.lat;
  const lon = parsed.queryParams.lon;

  const realInitialEvents = useMemo(() => {
    return initialEvents.filter(isEventSummaryResponseDTO);
  }, [initialEvents]);

  // Check if client-side filters are active
  const hasClientFilters = !!(search || distance || lat || lon);

  const { events, hasMore, loadMore, isLoadingMore, error } =
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

  // When filters are active, show ALL fetched events (replace SSR list)
  // When no filters, show only appended events (SSR list remains visible)
  const displayedEvents: ListEvent[] = useMemo(() => {
    if (!events || events.length === 0) return [];

    if (hasClientFilters) {
      // Filters active: show all filtered events (replace SSR list)
      return events;
    }

    // No filters: only show appended events beyond SSR list
    const seen = new Set<string>(realInitialEvents.map((e) => e.id));
    const uniqueAppended: EventSummaryResponseDTO[] = [];
    for (const event of events) {
      if (!isEventSummaryResponseDTO(event)) continue; // Skip ads in appended list
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      uniqueAppended.push(event);
    }
    return uniqueAppended;
  }, [events, realInitialEvents, hasClientFilters]);

  // Log errors for debugging
  if (error) {
    console.error("Events loading error:", error);
  }

  // Show error state when there's an error and filters are active
  const showErrorState = error && hasClientFilters;

  // Show no events found when filters are active, fetch completed, and no results
  const showNoEventsFound =
    hasClientFilters &&
    displayedEvents.length === 0 &&
    !error;

  // Show fallback events when filters return no results but we have initial events
  // (initialEvents may contain region or latest events as fallback from server)
  const showFallbackEvents = showNoEventsFound && realInitialEvents.length > 0;

  const notFoundTitle = useMemo(() => {
    if (!pageData?.notFoundTitle) {
      return undefined;
    }
    return appendSearchQuery(pageData.notFoundTitle, search);
  }, [pageData, search]);

  return (
    <>
      {showErrorState ? (
        // Show error message when events fail to load
        <div className="w-full flex flex-col items-center gap-element-gap py-section-y px-section-x">
          <div className="w-full text-center">
            <p className="body-normal text-foreground-strong mb-element-gap">
              {t("errorTitle")}
            </p>
            <p className="body-small text-foreground/80">
              {t("error")}
            </p>
          </div>
        </div>
      ) : showNoEventsFound ? (
        // Show no events found message when filters return no results
        <>
          <NoEventsFound
            title={notFoundTitle}
            description={pageData?.notFoundDescription}
          />
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
            isLoading={isLoadingMore}
            hasMore={hasMore}
          />
        </>
      )}
    </>
  );
}

function HybridEventsListClient(
  props: HybridEventsListClientProps
): ReactElement | null {
  return (
    <Suspense
      fallback={
        <div className="w-full">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardLoading key={`loading-${index}`} />
          ))}
        </div>
      }
    >
      <HybridEventsListClientContent {...props} />
    </Suspense>
  );
}

export default memo(HybridEventsListClient);
