import { useState, useEffect } from "react";
import useSWRInfinite from "swr/infinite";
import { fetchEvents } from "@lib/api/events";
import { EventSummaryResponseDTO, PagedResponseDTO } from "types/api/event";
import {
  FetchEventsParams,
  UseEventsOptions,
  UseEventsReturn,
} from "types/event";
import { captureException } from "@sentry/nextjs";

// SWR fetcher function for events API (single page)
const pageFetcher = async (
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
  const [isActivated, setIsActivated] = useState(false);

  // Reset activation when filters change (place, category, date)
  useEffect(() => {
    setIsActivated(false);
  }, [place, category, date]);

  // Build base params for the key/fetcher
  const baseParams: Omit<FetchEventsParams, "page" | "size"> & {
    size: number;
  } = {
    size: initialSize,
    place: place !== "catalunya" ? place : undefined,
    category,
    byDate: date,
  };

  // Key generator for SWR Infinite (page-by-page)
  const getKey = (
    pageIndex: number,
    previousPageData: PagedResponseDTO<EventSummaryResponseDTO> | null
  ) => {
    if (!isActivated) return null; // do not fetch until activated
    if (previousPageData && previousPageData.last) return null; // reached the end
    return [
      "events",
      baseParams.place,
      baseParams.category,
      baseParams.byDate,
      pageIndex,
      baseParams.size,
    ] as const;
  };

  const {
    data: pages,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
  } = useSWRInfinite<PagedResponseDTO<EventSummaryResponseDTO>>(
    getKey,
    ([, placeParam, categoryParam, byDateParam, pageIndex, sizeParam]) =>
      pageFetcher({
        page: Number(pageIndex),
        size: Number(sizeParam),
        place: placeParam as string | undefined,
        category: categoryParam as string | undefined,
        byDate: byDateParam as string | undefined,
      }),
    {
      // Provide SSR fallback as the first page when available
      fallbackData:
        fallbackData.length > 0
          ? [
              {
                content: fallbackData,
                currentPage: 0,
                pageSize: initialSize,
                totalElements: fallbackData.length,
                totalPages: 1,
                last: !serverHasMore,
              },
            ]
          : undefined,
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      refreshInterval: 0,
      dedupingInterval: 10000,
      focusThrottleInterval: 8000,
      errorRetryInterval: 7000,
      errorRetryCount: 3,
      suspense: false,
      onError: (e) => {
        console.error("Error fetching events:", e);
        captureException(e);
      },
    }
  );

  // Use fallback data when not activated, SWR data when activated
  const clientEvents = isActivated
    ? pages?.flatMap((p) => p.content) ?? []
    : fallbackData;

  const totalEvents = isActivated
    ? pages && pages.length > 0
      ? pages[pages.length - 1]?.totalElements ?? clientEvents.length
      : clientEvents.length
    : fallbackData.length;

  const lastPage = isActivated && pages ? pages[pages.length - 1] : undefined;
  const hasMore = isActivated ? (lastPage ? !lastPage.last : false) : serverHasMore;

  const loadMore = () => {
    if (isLoading || isValidating || (isActivated && !hasMore)) return;
    if (!isActivated) {
      setIsActivated(true);
      // Activate and fetch next page beyond the SSR page
      setSize(2); // ensure we have at least two pages (SSR + next)
    } else {
      setSize((prev) => prev + 1);
    }
  };

  return {
    events: clientEvents,
    hasMore,
    totalEvents,
    loadMore,
    isLoading,
    isValidating,
    error: error as Error | undefined,
  };
};
