import { useEffect, JSX } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import { initializeStore } from "@utils/initializeStore";
import Events from "@components/ui/events";
import { fetchEvents, insertAds } from "@lib/api/events";
import { ListEvent } from "../../../types/api/event";
import { getPlaceTypeAndLabel } from "@utils/helpers";

interface InitialState {
  place: string;
  byDate: string;
  events: ListEvent[];
  noEventsFound: boolean;
  hasServerFilters: boolean;
}

interface ByDateProps {
  initialState: InitialState;
  placeTypeLabel: { type: string; label: string; regionLabel?: string };
}

export default function ByDate({
  initialState,
  placeTypeLabel,
}: ByDateProps): JSX.Element {
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

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

interface StaticProps {
  params: {
    place: string;
    byDate: string;
  };
}

export const getStaticProps: GetStaticProps<
  ByDateProps,
  StaticProps["params"]
> = async ({ params }) => {
  if (!params) {
    return {
      notFound: true,
    };
  }

  const { place, byDate } = params;

  const dateFunctions: { [key: string]: () => { from: Date; until: Date } } = {
    avui: () => ({ from: new Date(), until: new Date() }),
    dema: () => ({ from: new Date(), until: new Date() }),
    setmana: () => ({ from: new Date(), until: new Date() }),
    "cap-de-setmana": () => ({ from: new Date(), until: new Date() }),
  };

  const selectedFunction =
    dateFunctions[byDate] || (() => ({ from: new Date(), until: new Date() }));

  const { from, until } = selectedFunction();

  const paramsForFetch = {
    page: 0,
    maxResults: 100,
    place,
    byDate,
    from: from.toISOString().split("T")[0],
    until: until.toISOString().split("T")[0],
  };
  const events = await fetchEvents(paramsForFetch);
  const eventsWithAds = insertAds(events);

  const initialState: InitialState = {
    place,
    byDate,
    events: eventsWithAds,
    noEventsFound: events.length === 0,
    hasServerFilters: true,
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
