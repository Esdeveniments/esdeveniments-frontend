import { captureException } from "@sentry/nextjs";
import useSWR, { preload } from "swr";
import { PagedResponseDTO, EventSummaryResponseDTO } from "types/api/event";
import { fetchEventsFromBackend } from "../../lib/api/events";

interface EventsProps {
  events?: EventSummaryResponseDTO[];
}

interface UseGetEventsProps {
  props?: EventsProps;
  pageIndex: number;
  q?: string;
  refreshInterval?: boolean;
  maxResults?: number;
  town?: string;
  zone?: string;
  category?: string;
}

const fetcher = async (
  _: any,
  pageIndex: number,
  maxResults: number,
  q?: string,
  town?: string,
  zone?: string,
  category?: string
): Promise<PagedResponseDTO<EventSummaryResponseDTO>> => {
  try {
    const params: Record<string, any> = {
      page: pageIndex,
      maxResults: maxResults,
    };
    if (q) params.q = q;
    if (town) params.town = town;
    if (zone) params.zone = zone;
    if (category) params.category = category;
    const content = await fetchEventsFromBackend(params);
    // Wrap in paged response structure for compatibility
    return {
      content,
      currentPage: pageIndex,
      pageSize: maxResults,
      totalElements: content.length,
      totalPages: 1,
      last: true,
    };
  } catch (error: any) {
    captureException(error);
    throw error;
  }
};

export const useGetEvents = ({
  props = {},
  pageIndex,
  q = "",
  refreshInterval = true,
  maxResults = 10,
  town = "",
  zone = "",
  category = "",
}: UseGetEventsProps) => {
  // Only fetch if pageIndex is a valid number
  const shouldFetch = typeof pageIndex === "number" && pageIndex >= 0;

  // Only include non-empty params in the key to avoid unnecessary re-fetches
  const swrKey = shouldFetch
    ? [
        "events",
        pageIndex,
        maxResults,
        q || null,
        town || null,
        zone || null,
        category || null,
      ]
    : null;

  if (swrKey) preload(swrKey, fetcher);

  const hasFallbackData = (props?.events?.length ?? 0) > 0;

  return useSWR<PagedResponseDTO<EventSummaryResponseDTO>>(swrKey, fetcher, {
    fallbackData: hasFallbackData
      ? {
          content: props.events || [],
          currentPage: 0,
          pageSize: 0,
          totalElements: 0,
          totalPages: 0,
          last: true,
        }
      : undefined,
    revalidateIfStale: true,
    refreshWhenOffline: false,
    suspense: true,
    keepPreviousData: true,
    revalidateOnMount: !hasFallbackData,
    dedupingInterval: 2000,
    focusThrottleInterval: 5000,
    errorRetryInterval: 5000,
    errorRetryCount: 3,
    refreshInterval: refreshInterval ? 300000 : 0,
    onError: (error: Error) => {
      console.error("Error fetching events:", error);
      captureException(error);
    },
  });
};
