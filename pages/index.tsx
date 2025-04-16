import { useEffect, JSX } from "react";
import { initializeStore } from "@utils/initializeStore";
import type { GetStaticProps } from "next";
import { EventLocation } from "../store";
import { CategorizedEvents, EventSummaryResponseDTO } from "../types/api/event";
import EventsCategorized from "@components/ui/eventsCategorized";
import { fetchCategorizedEvents } from "@lib/api/events";

interface InitialState {
  categorizedEvents: CategorizedEvents;
  latestEvents: EventSummaryResponseDTO[];
  userLocation?: EventLocation | null;
  currentYear?: number;
  noEventsFound: boolean;
}

interface HomeProps {
  initialState: InitialState;
}

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

  const initialState: InitialState = {
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
