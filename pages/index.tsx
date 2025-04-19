import { useEffect, JSX } from "react";
import { initializeStore } from "@utils/initializeStore";
import type { GetStaticProps } from "next";
import EventsCategorized from "@components/ui/eventsCategorized";
import { fetchCategorizedEvents } from "@lib/api/events";
import type { HomeInitialState, HomeProps } from "types/common";
import { generatePagesData } from "@components/partials/generatePagesData";
import type { PageData } from "types/common";

export default function Home({ initialState, pageData }: HomeProps & { pageData: PageData }): JSX.Element {
  useEffect(() => {
    initializeStore(initialState);
  }, [initialState]);

  return (
    <>
      <EventsCategorized pageData={pageData} />
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps & { pageData: PageData }> = async () => {
  const { categorizedEvents, latestEvents } = await fetchCategorizedEvents();

  const initialState: HomeInitialState = {
    categorizedEvents: categorizedEvents || {},
    latestEvents: latestEvents || [],
    noEventsFound:
      !categorizedEvents ||
      Object.values(categorizedEvents).every((events) => events.length === 0),
  };

  // Generate the SEO/page meta data server-side
  const pageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: "",
    byDate: "",
  });

  return {
    props: {
      initialState,
      pageData,
    },
  };
};
