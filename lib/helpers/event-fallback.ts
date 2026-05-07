import { addBreadcrumb } from "@sentry/nextjs";
import { fetchEvents } from "@lib/api/events";
import { fetchRegionsWithCities, fetchRegions } from "@lib/api/regions";
import { toLocalDateString } from "@utils/helpers";
import { getSanitizedErrorMessage } from "@utils/api-error-handler";
import type {
  EventFallbackLevel,
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
      fallbackLevel: "local",
    };
  }

  let latestResponse: PagedResponseDTO<EventSummaryResponseDTO> | null =
    initialResponse;
  const noEventsFound = true;

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
        recordFallbackUsage(place, "region", regionSlug);
        return {
          eventsResponse: latestResponse,
          events: latestResponse.content,
          noEventsFound,
          fallbackLevel: "region",
        };
      }
    }
  }

  if (options.finalFallback?.enabled === false) {
    recordFallbackUsage(place, "none");
    return {
      eventsResponse: latestResponse,
      events: latestResponse?.content ?? [],
      noEventsFound,
      fallbackLevel: "none",
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

  const finalLevel: EventFallbackLevel = hasEvents(latestResponse)
    ? "catalonia"
    : "none";
  recordFallbackUsage(place, finalLevel);

  return {
    eventsResponse: latestResponse,
    events: latestResponse?.content ?? [],
    noEventsFound,
    fallbackLevel: finalLevel,
  };
}

/**
 * Phase 0 telemetry: emits a Sentry breadcrumb (free, attached to any error)
 * and a structured console.info line (collected by Coolify/Docker logs).
 * Only called for non-"local" outcomes — successful town queries are silent.
 */
function recordFallbackUsage(
  place: string,
  level: Exclude<EventFallbackLevel, "local">,
  regionSlug?: string
): void {
  const data = { place, level, ...(regionSlug ? { regionSlug } : {}) };
  addBreadcrumb({
    category: "events.fallback",
    message: `events.fallback level=${level} place=${place}`,
    level: "info",
    data,
  });
  console.info("events.fallback", data);
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
