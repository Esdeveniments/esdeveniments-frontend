import { useEffect, JSX } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import Events from "@components/ui/events";
import { initializeStore } from "@utils/initializeStore";
import { fetchEvents, insertAds } from "@lib/api/events";
import { ListEvent } from "../../types/api/event";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import { fetchRegionsWithCities } from "@lib/api/regions";

interface InitialState {
  place: string;
  events: ListEvent[];
  noEventsFound: boolean;
  hasServerFilters: boolean;
}

interface PlaceProps {
  initialState: InitialState;
  placeTypeLabel: { type: string; label: string; regionLabel?: string };
}

interface StaticPathParams {
  place: string;
  [key: string]: string | string[] | undefined;
}

export default function Place({
  initialState,
  placeTypeLabel,
}: PlaceProps): JSX.Element {
  useEffect(() => {
    initializeStore(initialState);
  }, [initialState]);

  return (
    <Events
      events={initialState.events || []}
      hasServerFilters={initialState.hasServerFilters}
      placeTypeLabel={placeTypeLabel}
    />
  );
}

export const getStaticPaths: GetStaticPaths<StaticPathParams> = async () => {
  const paths: Array<{ params: StaticPathParams }> = [];

  const regions = await fetchRegionsWithCities();

  for (const region of regions) {
    paths.push({ params: { place: region.name } });
    if (region.cities) {
      for (const city of region.cities) {
        paths.push({ params: { place: city.value } });
      }
    }
  }

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<PlaceProps> = async (context) => {
  const { place } = context.params as StaticPathParams;

  const params = { page: 0, maxResults: 100, place };
  const events = await fetchEvents(params);
  const eventsWithAds = insertAds(events);

  const initialState: InitialState = {
    place,
    events: eventsWithAds,
    noEventsFound: events.length === 0,
    hasServerFilters: true,
  };

  const placeTypeLabel = await getPlaceTypeAndLabel(place);

  return {
    props: {
      initialState,
      placeTypeLabel,
    },
    revalidate: 60,
  };
};
