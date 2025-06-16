import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetchEvents } from "@lib/api/events";
import { EventSummaryResponseDTO, PagedResponseDTO } from "types/api/event";
import {
  FetchEventsParams,
  UseEventsOptions,
  UseEventsReturn,
} from "types/event";
import { captureException } from "@sentry/nextjs";

// SWR fetcher function for events API with cumulative pagination
const fetcher = async (
  params: FetchEventsParams
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> => {
  return await fetchEvents(params);
};

export const useEvents = ({
  place,
  category,
  date,
  initialSize = 10,
  fallbackData = [],
  serverHasMore = false,
}: UseEventsOptions): UseEventsReturn => {
  const [size, setSize] = useState(initialSize);
  const [isActivated, setIsActivated] = useState(false);

  // Reset size and deactivate when filters change (place, category, date)
  useEffect(() => {
    setSize(initialSize);
    setIsActivated(false);
  }, [place, category, date, initialSize]);

  // Build SWR key - only when activated and size > initial
  const key =
    isActivated && (place || category || date)
      ? ["events", place, category, date, size]
      : null;

  const { data, error, isLoading, isValidating } = useSWR(
    key,
    () =>
      fetcher({
        page: 0, // Always page 0 for cumulative pagination
        size, // Increasing size for "load more"
        zone: place !== "catalunya" ? place : undefined,
        category,
        byDate: date,
      }),
    {
      // Fallback data for SSR compatibility
      fallbackData:
        fallbackData.length > 0
          ? {
              content: fallbackData,
              currentPage: 0,
              pageSize: initialSize,
              totalElements: fallbackData.length,
              totalPages: Math.ceil(fallbackData.length / initialSize),
              last: fallbackData.length < initialSize,
            }
          : undefined,

      // SWR 2.x options for optimal UX
      keepPreviousData: true, // Prevents loading flickers during pagination
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      refreshWhenOffline: false,
      refreshInterval: 0, // Disable auto-refresh
      dedupingInterval: 2000,
      focusThrottleInterval: 5000,
      errorRetryInterval: 5000,
      errorRetryCount: 3,
      suspense: false, // Important for SSR compatibility

      onError: (error) => {
        console.error("Error fetching events:", error);
        captureException(error);
      },
    }
  );

  // Use fallback data when not activated, SWR data when activated
  const events = isActivated ? data?.content || [] : fallbackData;
  const totalEvents = isActivated
    ? data?.totalElements || 0
    : fallbackData.length;
  const hasMore = isActivated
    ? data
      ? !data.last && events.length < totalEvents
      : false
    : serverHasMore; // Use server's pagination info

  const loadMore = () => {
    if (isLoading || isValidating || !hasMore) return;

    // Activate the hook and increase size
    if (!isActivated) {
      setIsActivated(true);
      setSize(initialSize + 10); // Load initial + 10 more
    } else {
      setSize((prevSize) => prevSize + 10);
    }
  };

  return {
    events,
    hasMore,
    totalEvents,
    loadMore,
    isLoading,
    isValidating,
    error,
  };
};
