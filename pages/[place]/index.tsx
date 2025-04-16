import { useEffect, JSX } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import Events from "@components/ui/events";
import { initializeStore } from "@utils/initializeStore";
import { getRegions } from "@lib/apiHelpers";
import { fetchEventsFromBackend, insertAds } from "@lib/api/events";
import { ListEvent } from "../../types/api/event";
import { getPlaceTypeAndLabel } from "@utils/helpers";

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

export default function Place({ initialState, placeTypeLabel }: PlaceProps): JSX.Element {
  // If initialState or events is missing, show a fallback UI
  if (!initialState || !initialState.events) {
    return <div>No events found or data is loading.</div>;
  }

  useEffect(() => {
    initializeStore(initialState);
  }, [initialState]);

  return (
    <Events
      events={initialState.events}
      hasServerFilters={initialState.hasServerFilters}
      placeTypeLabel={placeTypeLabel}
    />
  );
}

export const getStaticPaths: GetStaticPaths<StaticPathParams> = async () => {
  const paths: Array<{ params: StaticPathParams }> = [];

  const regions = await getRegions();

  for (const regionSlug of Object.keys(regions)) {
    const region = regions[regionSlug];
    paths.push({
      params: {
        place: region.slug,
      },
    });
  }

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<PlaceProps> = async (context) => {
  const { place } = context.params as StaticPathParams;
  // Example params: filter by place (region/city), adjust as needed
  const params = { page: 0, maxResults: 100, place };
  const events = await fetchEventsFromBackend(params);
  const eventsWithAds = insertAds(events);

  const initialState: InitialState = {
    place,
    events: eventsWithAds,
    noEventsFound: events.length === 0,
    hasServerFilters: true, // or set dynamically if needed
  };

  // Fetch placeTypeLabel server-side
  const placeTypeLabel = await getPlaceTypeAndLabel(place);

  return {
    props: {
      initialState,
      placeTypeLabel,
    },
    revalidate: 60,
  };
};
