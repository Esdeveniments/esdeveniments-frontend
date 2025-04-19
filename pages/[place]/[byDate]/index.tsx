import { useEffect, JSX } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import { initializeStore } from "@utils/initializeStore";
import Events from "@components/ui/events";
import { fetchEvents, insertAds } from "@lib/api/events";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import { generatePagesData } from "@components/partials/generatePagesData";
import type { ByDateProps, InitialState, StaticProps, DateFunctionsMap, PageData, ByDateOptions } from "types/common";

export default function ByDate({
  initialState,
  placeTypeLabel,
  pageData,
}: ByDateProps & { pageData: PageData }): JSX.Element {
  useEffect(() => {
    initializeStore(initialState);
  }, [initialState]);

  return (
    <Events
      events={initialState.events}
      hasServerFilters={initialState.hasServerFilters}
      placeTypeLabel={placeTypeLabel}
      pageData={pageData}
    />
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<ByDateProps & { pageData: PageData }, StaticProps["params"]> = async ({ params }) => {
  if (!params) {
    return {
      notFound: true,
    };
  }

  const { place, byDate } = params;

  const dateFunctions: DateFunctionsMap = {
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
    byDate: byDate as ByDateOptions,
    events: eventsWithAds,
    noEventsFound: events.length === 0,
    hasServerFilters: true,
  };

  // Fetch placeTypeLabel server-side
  const placeTypeLabel = await getPlaceTypeAndLabel(place);

  // Generate the SEO/page meta data server-side, passing placeTypeLabel
  const pageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place,
    byDate: byDate as ByDateOptions,
    placeTypeLabel,
  });

  return {
    props: {
      initialState,
      placeTypeLabel,
      pageData,
    },
    revalidate: 60,
  };
};
