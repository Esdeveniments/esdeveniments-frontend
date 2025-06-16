"use client";

import { useEffect, memo, ReactElement, useMemo, useCallback } from "react";
import List from "@components/ui/list";
import Card from "@components/ui/card";
import LoadMoreButton from "@components/ui/loadMoreButton";
import { EventSummaryResponseDTO } from "types/api/event";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import NoEventsFound from "@components/ui/common/noEventsFound";
import useStore from "@store";
import { HybridEventsListProps } from "types/props";

function HybridEventsList({
  initialEvents = [],
  pageData,
  noEventsFound = false,
  place,
  category,
  date,
  totalServerEvents = 0,
}: HybridEventsListProps): ReactElement {
  const { loadedEvents, scrollPosition, setState } = useStore((state) => ({
    loadedEvents: state.loadedEvents,
    scrollPosition: state.scrollPosition,
    setState: state.setState,
  }));

  // Check if persisted data is stale (older than 1 hour) - memoized to prevent infinite loops
  const isDataStale = useCallback(() => {
    const lastUpdated = useStore.getState().lastUpdated;
    if (!lastUpdated) return true;
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    return Date.now() - lastUpdated > oneHour;
  }, []); // No dependencies - lastUpdated is read from store directly

  // Filter server events - memoize to prevent infinite re-renders
  const validInitialEvents = useMemo(
    () =>
      initialEvents.filter(
        isEventSummaryResponseDTO
      ) as EventSummaryResponseDTO[],
    [initialEvents]
  );

  // Smart pagination management - removed filter state synchronization
  useEffect(() => {
    const dataIsStale = isDataStale();

    if (dataIsStale || loadedEvents.length === 0) {
      // Initialize with server events if stale or no data
      setState("loadedEvents", validInitialEvents);
      setState("currentPage", 1);
      setState("lastUpdated", Date.now());
    }
    // Use persisted loadedEvents for navigation back (if not stale)
  }, [setState, validInitialEvents, loadedEvents.length, isDataStale]);

  // Use loadedEvents as the source of truth
  const allEvents =
    loadedEvents.length > validInitialEvents.length
      ? loadedEvents
      : validInitialEvents;

  // Restore scroll position on navigation back
  useEffect(() => {
    if (scrollPosition > 0 && typeof window !== "undefined") {
      // Use setTimeout to ensure DOM is ready
      const timer = setTimeout(() => {
        window.scrollTo({ top: scrollPosition, behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined; // Explicit return for all code paths
  }, [scrollPosition]);

  // Save scroll position when user scrolls
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      setState("scrollPosition", window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [setState]);

  console.log("HybridEventsList: allEvents length:", allEvents.length);
  console.log("HybridEventsList: noEventsFound:", noEventsFound);

  if (noEventsFound || allEvents.length === 0) {
    return (
      <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
        <NoEventsFound title={pageData?.notFoundText} />
        <List events={allEvents}>
          {(event: EventSummaryResponseDTO, index: number) => (
            <Card key={`${event.id}-${index}`} event={event} />
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
      {/* <div onClick={saveScrollPosition}> */}
      <List events={allEvents}>
        {(event: EventSummaryResponseDTO, index: number) => (
          <Card key={`${event.id}-${index}`} event={event} />
        )}
      </List>
      {/* </div> */}

      {/* Load More Button */}
      <LoadMoreButton
        place={place}
        category={category}
        date={date}
        totalServerEvents={totalServerEvents}
      />
    </div>
  );
}

export default memo(HybridEventsList);
