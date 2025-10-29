import { useState, useEffect, useRef } from "react";
import useSWRInfinite from "swr/infinite";
import { EventSummaryResponseDTO, PagedResponseDTO } from "types/api/event";
import {
  FetchEventsParams,
  UseEventsOptions,
  UseEventsReturn,
} from "types/event";
import { captureException } from "@sentry/nextjs";

// SWR fetcher function for events API (single page) via internal proxy
const pageFetcher = async (
  params: FetchEventsParams
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> => {
  const qs = new URLSearchParams();
  if (typeof params.page === "number") qs.set("page", String(params.page));
  if (typeof params.size === "number") qs.set("size", String(params.size));
  if (params.place) qs.set("place", params.place);
  if (params.category) qs.set("category", params.category);
  if (params.lat !== undefined) qs.set("lat", String(params.lat));
  if (params.lon !== undefined) qs.set("lon", String(params.lon));
  if (params.radius !== undefined) qs.set("radius", String(params.radius));
  if (params.term) qs.set("term", params.term);
  if (params.byDate) qs.set("byDate", params.byDate);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);

  const res = await fetch(`/api/events?${qs.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.status}`);
  }
  return (await res.json()) as PagedResponseDTO<EventSummaryResponseDTO>;
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
  // When the user clicks loadMore the first time we need to both activate and
  // fetch the *next* page beyond the SSR list. Previously we called setSize
  // during the same tick while the key was still null (because isActivated was
  // still false). SWR Infinite discards that size increase when the key moves
  // from null -> real key, so only page 0 was fetched and the user had to
  // click a second time. We capture that intent here and apply it *after*
  // activation so the first click yields new events immediately.
  const fetchNextAfterActivateRef = useRef(false);

  // Reset activation when filters change (place, category, date)
  useEffect(() => {
    setIsActivated(false);
    fetchNextAfterActivateRef.current = false;
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
    setSize,
  } = useSWRInfinite<PagedResponseDTO<EventSummaryResponseDTO>>(
    getKey,
    ([, placeParam, categoryParam, byDateParam, pageIndex, sizeParam]) =>
      pageFetcher({
        page: pageIndex as number,
        size: sizeParam as number,
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
      // Avoid revalidating the first page (SSR) on every size change
      revalidateFirstPage: false,
      // We already have SSR fallback; don't revalidate on mount
      revalidateOnMount: false,
    }
  );

  // After activation, if the first click intended to also fetch the next page,
  // perform the size increment now (when keys are established) so both page 0
  // (SSR/fallback) and page 1 are available right after the first click.
  useEffect(() => {
    if (isActivated && fetchNextAfterActivateRef.current) {
      fetchNextAfterActivateRef.current = false;
      setSize((prev) => prev + 1);
    }
  }, [isActivated, setSize]);

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
  const hasMore = isActivated
    ? lastPage
      ? !lastPage.last
      : false
    : serverHasMore;

  const loadMore = () => {
    if (isLoading || isValidating || (isActivated && !hasMore)) return;

    if (!isActivated) {
      // Mark that once activation completes we should fetch the next page.
      fetchNextAfterActivateRef.current = true;
      setIsActivated(true);
      return; // size bump will occur in the activation effect
    }

    // Already active: directly request one more page.
    setSize((prev) => prev + 1);
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
