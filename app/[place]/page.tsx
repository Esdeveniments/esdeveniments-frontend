import { fetchEvents, insertAds } from "@lib/api/events";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import { fetchRegionsWithCities } from "@lib/api/regions";
import { generatePagesData } from "@components/partials/generatePagesData";
import type { PlaceStaticPathParams, PlaceTypeAndLabel } from "types/common";
import { twoWeeksDefault } from "@lib/dates";
import { FetchEventsParams } from "types/event";
import PlaceClient from "./PlaceClient";

export const revalidate = 600;

export async function generateStaticParams() {
  const regions = await fetchRegionsWithCities();
  const params = [];
  for (const region of regions) {
    params.push({ place: region.name });
    if (region.cities) {
      for (const city of region.cities) {
        params.push({ place: city.value });
      }
    }
  }
  return params;
}

export default async function Page({
  params,
}: {
  params: Promise<PlaceStaticPathParams>;
}) {
  const { from, until } = twoWeeksDefault();
  const { place } = await params;
  const fetchParams: FetchEventsParams = {
    page: 0,
    maxResults: 100,
    town: place,
    from: from.toISOString(),
    until: until.toISOString(),
  };

  let events = await fetchEvents(fetchParams);
  let noEventsFound = false;

  if (!events || events.length === 0) {
    const regions = await fetchRegionsWithCities();
    const region = regions.find((r) =>
      r.cities.some((city) => city.value === place)
    );

    if (region) {
      events = await fetchEvents({
        page: 0,
        maxResults: 7,
        region: region.name,
        from: from.toISOString(),
        until: until.toISOString(),
      });
      noEventsFound = true;
    }
  }

  const eventsWithAds = insertAds(events);

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabel(place);

  const pageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place,
    byDate: "",
    placeTypeLabel,
  });

  const initialState = {
    place,
    events: eventsWithAds,
    noEventsFound,
    hasServerFilters: true,
  };

  return (
    <PlaceClient
      initialState={initialState}
      placeTypeLabel={placeTypeLabel}
      pageData={pageData}
    />
  );
}
