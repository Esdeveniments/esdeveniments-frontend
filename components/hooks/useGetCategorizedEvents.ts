import { captureException } from "@sentry/nextjs";
import useSWR, { preload, SWRResponse } from "swr";
import { CategorizedEvents, EventSummaryResponseDTO } from "types/api/event";

interface UseGetCategorizedEventsProps {
  props?: {
    categorizedEvents?: CategorizedEvents;
    latestEvents?: EventSummaryResponseDTO[];
  };
  // Removed searchTerms and maxResults as they are not supported by the backend endpoint
  refreshInterval?: boolean;
}

export interface CategorizedEventsResponse {
  categorizedEvents: CategorizedEvents;
  latestEvents?: EventSummaryResponseDTO[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const EVENTS_CATEGORIZED_URL = `${API_URL}/events/categorized`;

const fetcher = async (url: string): Promise<CategorizedEventsResponse> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

export const useGetCategorizedEvents = ({
  props = {},
  refreshInterval = true,
}: UseGetCategorizedEventsProps): SWRResponse<CategorizedEventsResponse> => {
  preload(EVENTS_CATEGORIZED_URL, fetcher);

  return useSWR<CategorizedEventsResponse>(
    EVENTS_CATEGORIZED_URL,
    fetcher,
    {
      fallbackData: props as CategorizedEventsResponse,
      refreshInterval: refreshInterval ? 300000 : 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      refreshWhenOffline: false,
      suspense: true,
      keepPreviousData: true,
      revalidateOnMount: false,
      dedupingInterval: 2000,
      focusThrottleInterval: 5000,
      errorRetryInterval: 5000,
      errorRetryCount: 3,
      onError: (error) => {
        console.error("Error fetching categorized events:", error);
        captureException(error);
      },
    }
  );
};