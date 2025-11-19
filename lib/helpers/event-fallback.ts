import { fetchEvents } from "@lib/api/events";
import { fetchRegionsWithCities, fetchRegions } from "@lib/api/regions";
import { toLocalDateString } from "@utils/helpers";
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

const DEFAULT_STAGE_SIZE = 7;

export async function fetchEventsWithFallback(
  options: FetchEventsWithFallbackOptions
): Promise<FetchEventsWithFallbackResult> {
  const { initialParams, place } = options;
  const initialResponse = await fetchEvents(initialParams);

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
      const regionParams = buildStageParams(
        initialParams,
        {
          page: 0,
          size: options.regionFallback?.size ?? DEFAULT_STAGE_SIZE,
          place: regionSlug,
        },
        options.regionFallback
      );

      latestResponse = await fetchEvents(regionParams);

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
  const finalParams = buildStageParams(
    initialParams,
    {
      page: 0,
      size: finalOptions.size ?? DEFAULT_STAGE_SIZE,
      place: finalOptions.place,
    },
    finalOptions
  );

  latestResponse = await fetchEvents(finalParams);

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
    console.error(
      "fetchEventsWithFallback: unable to resolve region slug for place",
      error
    );
    return null;
  }
}

function buildStageParams(
  initialParams: FetchEventsParams,
  overrides: Partial<FetchEventsParams>,
  stageOptions?: EventFallbackStageOptions
): FetchEventsParams {
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
    const range = stageOptions.dateRangeFactory();
    params.from = toLocalDateString(range.from);
    params.to = toLocalDateString(range.until);
  }

  if ("place" in overrides && overrides.place === undefined) {
    delete params.place;
  }

  return params;
}
