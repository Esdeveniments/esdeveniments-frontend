import { fetchEvents } from "@lib/api/events";
import { fetchRegionsWithCities, fetchRegions } from "@lib/api/regions";
import {
  FetchEventsParams,
  FetchEventsWithFallbackResult,
  FetchEventsWithFallbackOptions,
} from "types/event";




export async function fetchEventsWithFallback({
  place,
  initialParams,
  onFallbackParams,
}: FetchEventsWithFallbackOptions): Promise<FetchEventsWithFallbackResult> {
  let eventsResponse = await fetchEvents(initialParams);
  let noEventsFound = false;

  if (
    !eventsResponse ||
    !eventsResponse.content ||
    eventsResponse.content.length === 0
  ) {
    const regionsWithCities = await fetchRegionsWithCities();
    const regionWithCities = regionsWithCities.find((r) =>
      r.cities.some((city) => city.value === place)
    );

    if (regionWithCities) {
      const regions = await fetchRegions();
      const regionWithSlug = regions.find((r) => r.id === regionWithCities.id);

      if (regionWithSlug) {
        let fallbackParams: FetchEventsParams = {
          ...initialParams,
          place: regionWithSlug.slug,
          size: 7,
          page: 0,
        };

        if (onFallbackParams) {
          fallbackParams = onFallbackParams(fallbackParams);
        }

        eventsResponse = await fetchEvents(fallbackParams);
        noEventsFound = true;
      }
    }
  }

  if (
    !eventsResponse ||
    !eventsResponse.content ||
    eventsResponse.content.length === 0
  ) {
    let globalParams: FetchEventsParams = {
      ...initialParams,
      size: 7,
      page: 0,
    };
    delete globalParams.place;

    if (onFallbackParams) {
      globalParams = onFallbackParams(globalParams);
    }

    eventsResponse = await fetchEvents(globalParams);
    noEventsFound = true;
  }

  return {
    events: eventsResponse?.content || [],
    noEventsFound,
    serverHasMore: eventsResponse ? !eventsResponse.last : false,
  };
}
