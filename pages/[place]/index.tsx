import { useEffect, JSX } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import Events from "@components/ui/events";
import { initializeStore } from "@utils/initializeStore";
import { fetchEvents, insertAds } from "@lib/api/events";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import { fetchRegionsWithCities } from "@lib/api/regions";
import type {
  PlaceInitialState,
  PlaceProps,
  PlaceStaticPathParams,
  PlaceStaticPath,
} from "types/common";
import { generatePagesData } from "@components/partials/generatePagesData";
import type { PageData } from "types/common";

export default function Place({
  initialState,
  placeTypeLabel,
  pageData,
}: PlaceProps & { pageData: PageData }): JSX.Element {
  useEffect(() => {
    initializeStore(initialState);
  }, [initialState]);

  return (
    <Events
      events={initialState.events || []}
      hasServerFilters={initialState.hasServerFilters}
      placeTypeLabel={placeTypeLabel}
      pageData={pageData}
    />
  );
}

export const getStaticPaths: GetStaticPaths<
  PlaceStaticPathParams
> = async () => {
  const paths: PlaceStaticPath[] = [];

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

export const getStaticProps: GetStaticProps<PlaceProps & { pageData: PageData }> = async (context) => {
  const { place } = context.params as PlaceStaticPathParams;

  const params = { page: 0, maxResults: 100, place };
  const events = await fetchEvents(params);
  const eventsWithAds = insertAds(events);

  const initialState: PlaceInitialState = {
    place,
    events: eventsWithAds,
    noEventsFound: events.length === 0,
    hasServerFilters: true,
  };

  const placeTypeLabel = await getPlaceTypeAndLabel(place);

  // Generate the SEO/page meta data server-side, passing placeTypeLabel
  const pageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place,
    byDate: "",
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
