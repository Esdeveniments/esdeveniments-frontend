import { useEffect, JSX } from "react";
import { initializeStore } from "@utils/initializeStore";
import type { GetStaticProps } from "next";
import EventsCategorized from "@components/ui/eventsCategorized";
import { fetchCategorizedEvents } from "@lib/api/events";
import type { HomeInitialState, HomeProps } from "types/common";

export default function Home({ initialState }: HomeProps): JSX.Element {
  useEffect(() => {
    initializeStore(initialState);
  }, [initialState]);

  return (
    <>
      <EventsCategorized />
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const { categorizedEvents, latestEvents } = await fetchCategorizedEvents();

  const initialState: HomeInitialState = {
    categorizedEvents: categorizedEvents || {},
    latestEvents: latestEvents || [],
    noEventsFound:
      !categorizedEvents ||
      Object.values(categorizedEvents).every((events) => events.length === 0),
  };

  return {
    props: {
      initialState,
    },
  };
};
