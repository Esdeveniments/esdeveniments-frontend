"use client";

import { memo, ReactElement, useMemo } from "react";
import List from "@components/ui/list";
import Card from "@components/ui/card";
import LoadMoreButton from "@components/ui/loadMoreButton";
import { EventSummaryResponseDTO } from "types/api/event";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { useEvents } from "@components/hooks/useEvents";
import { HybridEventsListProps } from "types/props";

function HybridEventsList({
  initialEvents = [],
  pageData,
  noEventsFound = false,
  place,
  category,
  date,
  serverHasMore = false,
}: HybridEventsListProps): ReactElement {
  // Filter server events - memoize to prevent infinite re-renders
  const validInitialEvents = useMemo(
    () =>
      initialEvents.filter(
        isEventSummaryResponseDTO
      ) as EventSummaryResponseDTO[],
    [initialEvents]
  );

  // Use SWR hook for data fetching with cumulative pagination
  const {
    events,
    hasMore,
    totalEvents,
    loadMore,
    isLoading,
    isValidating,
    error,
  } = useEvents({
    place,
    category,
    date,
    initialSize: 10,
    fallbackData: validInitialEvents,
    serverHasMore,
  });

  // Use SWR events if available, otherwise fall back to initial events
  const allEvents = events.length > 0 ? events : validInitialEvents;

  console.log("🔍 HybridEventsList Debug:", {
    serverHasMore,
    hasMore,
    totalEvents,
    allEventsLength: allEvents.length,
    validInitialEventsLength: validInitialEvents.length,
    eventsLength: events.length,
    isLoading,
    isValidating,
  });

  // Handle error state
  if (error) {
    console.error("Events loading error:", error);
    // Fall back to initial events on error
  }

  if (noEventsFound || allEvents.length === 0) {
    return (
      <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
        <NoEventsFound title={pageData?.notFoundText} />
        <List events={allEvents}>
          {(event: EventSummaryResponseDTO, index: number) => (
            <Card
              key={`${event.id}-${index}`}
              event={event}
              isPriority={index === 0}
            />
          )}
        </List>
      </div>
    );
  }

  return (
    <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
      {/* SEO Content */}
      {pageData && (
        <>
          <h1 className="uppercase mb-2 px-2">{pageData.title}</h1>
          <p className="text-[16px] font-normal text-blackCorp text-left mb-10 px-2 font-barlow">
            {pageData.subTitle}
          </p>
        </>
      )}

      {/* Events List */}
      <List events={allEvents}>
        {(event: EventSummaryResponseDTO, index: number) => (
          <Card
            key={`${event.id}-${index}`}
            event={event}
            isPriority={index === 0}
          />
        )}
      </List>

      {/* Load More Button - using new SWR props */}
      <LoadMoreButton
        onLoadMore={loadMore}
        isLoading={isLoading}
        isValidating={isValidating}
        hasMore={hasMore}
      />
    </div>
  );
}

export default memo(HybridEventsList);
