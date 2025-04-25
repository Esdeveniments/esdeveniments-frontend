import { fetchEvents, insertAds } from "@lib/api/events";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import { generatePagesData } from "@components/partials/generatePagesData";
import { today, tomorrow, week, weekend, twoWeeksDefault } from "@lib/dates";
import { PlaceTypeAndLabel } from "types/common";
import { FetchEventsParams } from "types/event";
import { fetchRegionsWithCities } from "@lib/api/regions";
import ByDateClient from "./ByDateClient";

export default async function ByDatePage({
  params,
}: {
  params: Promise<{ place: string; byDate: string }>;
}) {
  const { place, byDate } = await params;

  const dateFunctions = {
    avui: today,
    dema: tomorrow,
    setmana: week,
    "cap-de-setmana": weekend,
  };
  const selectedFunction =
    dateFunctions[byDate as keyof typeof dateFunctions] || today;
  let { from, until } = selectedFunction();

  const paramsForFetch: FetchEventsParams = {
    page: 0,
    maxResults: 100,
    town: place,
    from: from.toISOString(),
    until: until.toISOString(),
  };

  let noEventsFound = false;
  let events = await fetchEvents(paramsForFetch);

  if (!events || events.length === 0) {
    const regions = await fetchRegionsWithCities();
    const region = regions.find((r) =>
      r.cities.some((city) => city.value === place)
    );

    if (region) {
      ({ from, until } = twoWeeksDefault());
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
    byDate,
    events: eventsWithAds,
    noEventsFound,
    hasServerFilters: true,
  };

  return (
    <ByDateClient
      initialState={initialState}
      placeTypeLabel={placeTypeLabel}
      pageData={pageData}
    />
  );
}
