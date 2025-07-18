"use client";

import { memo, ReactElement, useMemo, useEffect } from "react";
import List from "@components/ui/list";
import Card from "@components/ui/card";
import LoadMoreButton from "@components/ui/loadMoreButton";
import { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { useEvents } from "@components/hooks/useEvents";
import { HybridEventsListProps } from "types/props";
import { preloadImages } from "@utils/image-preload";
import { useNetworkDetection } from "@components/hooks/useNetworkSpeed";

function HybridEventsList({
  initialEvents = [],
  pageData,
  noEventsFound = false,
  place,
  category,
  date,
  serverHasMore = false,
}: HybridEventsListProps): ReactElement {
  // Initialize network detection for caching
  useNetworkDetection();

  const validInitialEvents = useMemo(
    () =>
      initialEvents.filter(
        isEventSummaryResponseDTO
      ) as EventSummaryResponseDTO[],
    [initialEvents]
  );

  const allEventsWithAds = useMemo(
    () => initialEvents, // Keep all events including ads for rendering
    [initialEvents]
  );

  const { events, hasMore, loadMore, isLoading, isValidating, error } =
    useEvents({
      place,
      category,
      date,
      initialSize: 10,
      fallbackData: validInitialEvents,
      serverHasMore,
    });

  const allEvents = allEventsWithAds.length > 0 ? allEventsWithAds : events;

  // Preload first 3 images for better LCP
  useEffect(() => {
    const imagesToPreload = allEvents
      .slice(0, 3)
      .filter((event) => isEventSummaryResponseDTO(event) && event.imageUrl)
      .map((event, index) => ({
        src: (event as EventSummaryResponseDTO).imageUrl!,
        options: {
          priority: index === 0,
          quality: index === 0 ? 85 : 75,
          sizes:
            "(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw",
        },
      }));

    if (imagesToPreload.length > 0) {
      preloadImages(imagesToPreload);
    }
  }, [allEvents]);

  if (error) {
    console.error("Events loading error:", error);
  }

  if (noEventsFound || allEvents.length === 0) {
    return (
      <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
        <NoEventsFound title={pageData?.notFoundText} />
        <List events={allEvents}>
          {(event: ListEvent, index: number) => (
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
        {(event: ListEvent, index: number) => (
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
