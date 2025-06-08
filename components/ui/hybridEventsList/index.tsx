"use client";

import { useEffect, memo, ReactElement } from "react";
import List from "@components/ui/list";
import Card from "@components/ui/card";
import LoadMoreButton from "@components/ui/loadMoreButton";
import { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import { PageData, PlaceTypeAndLabel } from "types/common";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import NoEventsFound from "@components/ui/common/noEventsFound";
import useStore, { EventCategory } from "@store";

interface HybridEventsListProps {
  initialEvents: ListEvent[];
  placeTypeLabel?: PlaceTypeAndLabel;
  pageData?: PageData;
  noEventsFound?: boolean;
  place: string;
  category?: string;
  date?: string;
  totalServerEvents?: number; // Total number of events from server for pagination
}

function HybridEventsList({
  initialEvents = [],
  // placeTypeLabel, // Currently unused but kept for future features
  pageData,
  noEventsFound = false,
  place,
  category,
  date,
  totalServerEvents = 0,
}: HybridEventsListProps): ReactElement {
  const {
    loadedEvents,
    resetPagination,
    scrollPosition,
    setState,
    saveScrollPosition,
  } = useStore((state) => ({
    loadedEvents: state.loadedEvents,
    resetPagination: state.resetPagination,
    scrollPosition: state.scrollPosition,
    setState: state.setState,
    saveScrollPosition: state.saveScrollPosition,
  }));

  // Check if persisted data is stale (older than 1 hour)
  const isDataStale = () => {
    const lastUpdated = useStore.getState().lastUpdated;
    if (!lastUpdated) return true;
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    return Date.now() - lastUpdated > oneHour;
  };

  // Filter server events
  const validInitialEvents = initialEvents.filter(
    isEventSummaryResponseDTO
  ) as EventSummaryResponseDTO[];

  // Smart pagination management
  useEffect(() => {
    const storedPlace = useStore.getState().place;
    const storedCategory = useStore.getState().category;

    // Check if this is a real filter change vs just navigation back
    const isPlaceChange = storedPlace !== place;
    const isCategoryChange = storedCategory !== (category || "");
    const dataIsStale = isDataStale();

    if (isPlaceChange || isCategoryChange || dataIsStale) {
      // Real filter change or stale data - reset pagination and initialize with server events
      resetPagination();
      setState("place", place);
      setState("category", (category || "") as EventCategory | "");
      setState("currentPage", 1);
      setState("loadedEvents", validInitialEvents);
      setState("lastUpdated", Date.now());
    } else if (loadedEvents.length === 0) {
      // First load or no persisted data - initialize with server events
      setState("loadedEvents", validInitialEvents);
      setState("currentPage", 1);
      setState("lastUpdated", Date.now());
    }
    // Otherwise, use persisted loadedEvents (user navigated back)
  }, [
    place,
    category,
    date,
    resetPagination,
    setState,
    validInitialEvents,
    loadedEvents.length,
    isDataStale,
  ]);

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

  if (noEventsFound || allEvents.length === 0) {
    return <NoEventsFound />;
  }

  return (
    <div className="w-full bg-whiteCorp flex flex-col justify-center items-center overflow-hidden">
      <div className="w-full flex flex-col justify-center items-center gap-4 sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
        {/* SEO Content */}
        {pageData && (
          <div className="w-full px-4 mb-6">
            <h1 className="text-2xl font-bold mb-2">{pageData.title}</h1>
            <p className="text-gray-700 leading-relaxed">{pageData.subTitle}</p>
          </div>
        )}

        {/* Events List */}
        <div onClick={saveScrollPosition}>
          <List events={allEvents}>
            {(event: EventSummaryResponseDTO, index: number) => (
              <Card key={`${event.id}-${index}`} event={event} />
            )}
          </List>
        </div>

        {/* Load More Button */}
        <LoadMoreButton
          place={place}
          category={category}
          date={date}
          totalServerEvents={totalServerEvents}
        />
      </div>
    </div>
  );
}

export default memo(HybridEventsList);
