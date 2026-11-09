import { cacheLife } from "next/cache";
import { fetchEvents } from "@lib/api/events";
import { twoWeeksDefault } from "@lib/dates";
import { fetchRegionsWithCities, fetchRegions } from "@lib/api/regions";
import { toLocalDateString } from "@utils/helpers";
import { getSanitizedErrorMessage } from "@utils/api-error-handler";
import type {
  EventFallbackStageOptions,
  FetchEventsParams,
  FetchEventsWithFallbackOptions,
  FetchEventsWithFallbackResult,
} from "types/event";
import type {
  EventSummaryResponseDTO,
  PagedResponseDTO,
} from "types/api/event";
import type { DateRange } from "types/common";

const DEFAULT_STAGE_SIZE = 7;

/**
 * twoWeeksDefault for listing pages. It reads the clock, which a prerender may
 * only do inside "use cache" (Next blocks the route otherwise). An hour-old
 * "today" is fine for a fallback range.
 */
export async function twoWeeksDefaultCached(): Promise<DateRange> {
  "use cache";
  cacheLife("hours");
  return twoWeeksDefault();
}

export async function fetchEventsWithFallback(
  options: FetchEventsWithFallbackOptions
): Promise<FetchEventsWithFallbackResult> {
  const { initialParams, place, fetcher = fetchEvents } = options;
  const initialResponse = await fetcher(initialParams);

  if (hasEvents(initialResponse)) {
    return {
      eventsResponse: initialResponse,
      events: initialResponse.content,
      noEventsFound: false,
    };
  }

  let latestResponse: PagedResponseDTO<EventSummaryResponseDTO> | null =
    initialResponse;
  let noEventsFound = true;

  if (shouldAttemptRegionFallback(place, options.regionFallback)) {
    const regionSlug = await resolveRegionSlugForPlace(place);

    if (regionSlug) {
      const regionParams = await buildStageParams(
        initialParams,
        {
          page: 0,
          size: options.regionFallback?.size ?? DEFAULT_STAGE_SIZE,
          place: regionSlug,
        },
        options.regionFallback
      );

      latestResponse = await fetcher(regionParams);

      if (hasEvents(latestResponse)) {
        return {
          eventsResponse: latestResponse,
          events: latestResponse.content,
          noEventsFound,
        };
      }
    }
  }

  if (options.finalFallback?.enabled === false) {
    return {
      eventsResponse: latestResponse,
      events: latestResponse?.content ?? [],
      noEventsFound,
    };
  }

  const finalOptions = options.finalFallback ?? {};
  const finalParams = await buildStageParams(
    initialParams,
    {
      page: 0,
      size: finalOptions.size ?? DEFAULT_STAGE_SIZE,
      place: finalOptions.place,
    },
    finalOptions
  );

  latestResponse = await fetcher(finalParams);

  return {
    eventsResponse: latestResponse,
    events: latestResponse?.content ?? [],
    noEventsFound,
  };
}

function hasEvents(
  response: PagedResponseDTO<EventSummaryResponseDTO> | null
): boolean {
  return !!response?.content && response.content.length > 0;
}

function shouldAttemptRegionFallback(
  place: string,
  options?: EventFallbackStageOptions
): boolean {
  if (place === "catalunya") {
    return false;
  }
  if (options?.enabled === false) {
    return false;
  }
  return true;
}

async function resolveRegionSlugForPlace(
  place: string
): Promise<string | null> {
  try {
    const regionsWithCities = await fetchRegionsWithCities();
    const regionWithCities = regionsWithCities.find((region) =>
      region.cities.some((city) => city.value === place)
    );

    if (!regionWithCities) {
      return null;
    }

    const regions = await fetchRegions();
    const regionWithSlug = regions.find(
      (region) => region.id === regionWithCities.id
    );

    return regionWithSlug?.slug ?? null;
  } catch (error) {
    const errorMessage = getSanitizedErrorMessage(error);
    console.error(
      "fetchEventsWithFallback: unable to resolve region slug for place",
      errorMessage
    );
    return null;
  }
}

async function buildStageParams(
  initialParams: FetchEventsParams,
  overrides: Partial<FetchEventsParams>,
  stageOptions?: EventFallbackStageOptions
): Promise<FetchEventsParams> {
  const params: FetchEventsParams = {
    ...initialParams,
    ...overrides,
  };

  if (stageOptions?.includeCategory === false) {
    delete params.category;
  }

  if (stageOptions?.includeDateRange === false) {
    delete params.from;
    delete params.to;
  } else if ((!params.from || !params.to) && stageOptions?.dateRangeFactory) {
    const range = await stageOptions.dateRangeFactory();
    params.from = toLocalDateString(range.from);
    params.to = toLocalDateString(range.until);
  }

  if ("place" in overrides && overrides.place === undefined) {
    delete params.place;
  }

  return params;
}
