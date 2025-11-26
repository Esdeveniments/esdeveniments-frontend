import { useMemo, useState } from "react";
import { getDateRangeFromByDate } from "@lib/dates";
import { toLocalDateString } from "@utils/helpers";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";
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
  search,
  distance,
  lat,
  lon,
  initialSize = 10,
  fallbackData = [],
  serverHasMore = false,
}: UseEventsOptions): UseEventsReturn => {
  const [activationKey, setActivationKey] = useState<string | null>(null);
  const [targetPageCount, setTargetPageCount] = useState<number | null>(null);

  const currentKey = useMemo(
    () =>
      `${place}|${category}|${date}|${search}|${distance}|${lat}|${lon}|${initialSize}`,
    [place, category, date, search, distance, lat, lon, initialSize]
  );

  const hasClientFilters = !!(search || distance || lat || lon);

  const isActivated = hasClientFilters || activationKey === currentKey;

  const dateRange = getDateRangeFromByDate(date || DEFAULT_FILTER_VALUE);
  const range = dateRange
    ? {
        from: toLocalDateString(dateRange.from),
        to: toLocalDateString(dateRange.until),
      }
    : {};

  const baseParams: Omit<FetchEventsParams, "page" | "size"> & {
    size: number;
  } = {
    size: initialSize,
    place: place !== "catalunya" ? place : undefined,
    category,
    byDate: date,
    from: range.from,
    to: range.to,
    term: search,
    radius: distance ? parseFloat(distance) : undefined,
    lat: lat ? parseFloat(lat) : undefined,
    lon: lon ? parseFloat(lon) : undefined,
  };

  const getKey = (
    pageIndex: number,
    previousPageData: PagedResponseDTO<EventSummaryResponseDTO> | null
  ) => {
    if (previousPageData && previousPageData.last) return null; // reached the end
    return [
      "events",
      baseParams.place,
      baseParams.category,
      baseParams.byDate,
      baseParams.from,
      baseParams.to,
      baseParams.term,
      baseParams.radius,
      baseParams.lat,
      baseParams.lon,
      pageIndex,
      baseParams.size,
    ] as const;
  };

  const {
    data: pages,
    error,
    setSize,
  } = useSWRInfinite<PagedResponseDTO<EventSummaryResponseDTO>>(
    getKey,
    ([
      ,
      placeParam,
      categoryParam,
      byDateParam,
      fromParam,
      toParam,
      termParam,
      radiusParam,
      latParam,
      lonParam,
      pageIndex,
      sizeParam,
    ]) =>
      pageFetcher({
        page: pageIndex as number,
        size: sizeParam as number,
        place: placeParam as string | undefined,
        category: categoryParam as string | undefined,
        byDate: byDateParam as string | undefined,
        from: fromParam as string | undefined,
        to: toParam as string | undefined,
        term: termParam as string | undefined,
        radius: radiusParam as number | undefined,
        lat: latParam as number | undefined,
        lon: lonParam as number | undefined,
      }),
    {
      // When using Suspense in SSR, fallbackData is required.
      // For client-only filters (search, distance, lat, lon), provide an empty page
      // so SWR can fetch fresh data client-side without SSR errors.
      fallbackData:
        !hasClientFilters && fallbackData.length > 0
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
          : [
              {
                content: [],
                currentPage: 0,
                pageSize: initialSize,
                totalElements: 0,
                totalPages: 0,
                last: true,
              },
            ],

      keepPreviousData: !hasClientFilters,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,

      revalidateIfStale: hasClientFilters,
      refreshWhenOffline: false,
      refreshInterval: 0,
      dedupingInterval: 10000,
      focusThrottleInterval: 8000,
      errorRetryInterval: 7000,
      errorRetryCount: 3,
      suspense: true,
      onError: (e) => {
        console.error("Error fetching events:", e);
        captureException(e);
      },
      revalidateFirstPage: false,
      revalidateOnMount: hasClientFilters,
    }
  );

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
  const currentPageCount = pages?.length ?? 0;
  const isLoadingMore =
    targetPageCount !== null && currentPageCount < targetPageCount && !error;

  const loadMore = async () => {
    if (isActivated && (!hasMore || isLoadingMore)) return;

    if (!isActivated) {
      setActivationKey(currentKey);
    }

    // Request one more page. If activating, this will fetch the first page of client-side data (page 0 or 1).
    setTargetPageCount(currentPageCount + 1);
    await setSize((prev) => prev + 1);
  };

  return {
    events: clientEvents,
    hasMore,
    totalEvents,
    isLoadingMore,
    loadMore,
    error: error as Error | undefined,
  };
};
