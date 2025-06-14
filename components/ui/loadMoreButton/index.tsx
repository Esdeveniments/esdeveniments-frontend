"use client";

import { useState } from "react";
import { fetchEvents } from "@lib/api/events";
import useStore from "@store";
import { EventSummaryResponseDTO } from "types/api/event";
import { FetchEventsParams } from "types/event";
import { LoadMoreButtonProps } from "types/props";

export default function LoadMoreButton({
  place,
  category,
  totalServerEvents = 0,
}: LoadMoreButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { currentPage, hasMoreEvents, loadedEvents, loadMoreEvents, hydrated } =
    useStore((state) => ({
      currentPage: state.currentPage,
      hasMoreEvents: state.hasMoreEvents,
      loadedEvents: state.loadedEvents,
      loadMoreEvents: state.loadMoreEvents,
      hydrated: state.hydrated,
    }));

  // Calculate if we should show the button based on both persisted state and server data
  const shouldShowButton = (() => {
    if (!hydrated) return false; // Don't show until hydrated to prevent layout shift

    // If we have loaded events, check if there are more based on total count
    if (loadedEvents.length > 0 && totalServerEvents > 0) {
      return loadedEvents.length < totalServerEvents;
    }

    // Fall back to persisted hasMoreEvents state
    return hasMoreEvents;
  })();

  const handleLoadMore = async () => {
    if (isLoading || !shouldShowButton) return;

    setIsLoading(true);

    try {
      const fetchParams: FetchEventsParams = {
        page: currentPage + 1, // Load next page
        size: 10,
        zone: place !== "catalunya" ? place : undefined, // Only add zone if not "catalunya"
      };

      // Add filters if present
      if (category) fetchParams.category = category;
      // Note: date filtering would be added here when backend supports it

      const response = await fetchEvents(fetchParams);

      if (response && response.content && Array.isArray(response.content)) {
        // Filter out ads for consistency
        const validEvents = response.content.filter(
          (event): event is EventSummaryResponseDTO => !("isAd" in event)
        );
        loadMoreEvents(validEvents, response.last);
      }
    } catch (error) {
      console.error("Error loading more events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!shouldShowButton) {
    return null; // Hide button when no more events or not hydrated
  }

  return (
    <div className="w-full flex justify-center items-center py-8">
      <button
        type="button"
        onClick={handleLoadMore}
        disabled={isLoading}
        className="w-[120px] bg-whiteCorp flex justify-center items-center gap-2 font-barlow italic uppercase tracking-wider font-semibold p-2 border-2 border-bColor rounded-lg hover:bg-primary hover:text-whiteCorp hover:border-whiteCorp ease-in-out duration-300 focus:outline-none"
      >
        {isLoading ? "Carregant..." : "Carregar més"}
      </button>
    </div>
  );
}
