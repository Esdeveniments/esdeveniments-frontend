import {
  memo,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactElement,
  RefObject,
} from "react";
import Script from "next/script";
import dynamic from "next/dynamic";
import Meta from "@components/partials/seo-meta";
import { useGetEvents } from "@components/hooks/useGetEvents";
import {
  generateJsonData,
  getDistance,
  findCategoryKeyByValue,
} from "@utils/helpers";
import { dateFunctions } from "@utils/constants";
import List from "@components/ui/list";
import CardLoading from "@components/ui/cardLoading";
import Card from "@components/ui/card";
import { CATEGORIES } from "@utils/constants";
import useOnScreen from "@components/hooks/useOnScreen";
import useStore from "@store";
import { UserLocation } from "@store";
import { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import { EventsListProps } from "../../../types/props";
import { FetchedData, PageData } from "types/common";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";

const NoEventsFound = dynamic(
  () => import("@components/ui/common/noEventsFound"),
  {
    loading: () => null,
  }
);

function EventsList({
  events: serverEvents = [],
  placeTypeLabel,
  pageData: serverPageData,
}: EventsListProps & { pageData?: PageData }): ReactElement {
  const {
    noEventsFound: serverNoEventsFound,
    byDate,
    category,
    searchTerm,
    userLocation,
    distance,
    page,
    scrollPosition,
    setState,
  } = useStore((state) => ({
    events: state.events,
    noEventsFound: state.noEventsFound,
    byDate: state.byDate,
    category: state.category,
    searchTerm: state.searchTerm,
    userLocation: state.userLocation,
    distance: state.distance,
    page: state.page,
    scrollPosition: state.scrollPosition,
    currentYear: state.currentYear,
    setState: state.setState,
  }));

  const noEventsFoundRef = useRef<Element>(null) as RefObject<Element>;
  const divRef = useRef<HTMLDivElement>(null);
  const isNoEventsFoundVisible = useOnScreen(noEventsFoundRef, {
    freezeOnceVisible: true,
  });
  const isBrowser = typeof window !== "undefined";

  // State
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [filteredEvents, setFilteredEvents] = useState<ListEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { type, label, regionLabel } = placeTypeLabel ?? {};

  const categoryKey = category ? findCategoryKeyByValue(category) : undefined;
  const categoryQuery = categoryKey ? CATEGORIES[categoryKey] : category || "";
  const sharedQuery = `${searchTerm} ${categoryQuery} ${label}`;
  const pageIndex =
    typeof dateFunctions[byDate] === "number" ? dateFunctions[byDate] : 0;

  const {
    data: fetchedData = {} as FetchedData,
    isValidating,
    error,
  } = useGetEvents({
    props: {
      events: serverEvents.filter(isEventSummaryResponseDTO),
    },
    pageIndex,
    maxResults: page * 10,
    q: type === "town" ? `${sharedQuery} ${regionLabel}` : sharedQuery,
    town: type === "town" ? label : "",
  });

  // Use content from paginated response
  const events = fetchedData.content?.length
    ? fetchedData.content
    : serverEvents;
  const noEventsFound =
    "noEventsFound" in fetchedData
      ? (fetchedData as { noEventsFound: boolean }).noEventsFound
      : serverNoEventsFound;
  const allEventsLoaded =
    "allEventsLoaded" in fetchedData
      ? (fetchedData as { allEventsLoaded: boolean }).allEventsLoaded
      : false;

  const notFound =
    !isLoading &&
    !isValidating &&
    (noEventsFound || filteredEvents.length === 0);

  const jsonEvents = events
    .filter(isEventSummaryResponseDTO)
    .map((event) => {
      try {
        return generateJsonData(event);
      } catch (err) {
        console.error("Error generating JSON data for event:", err, event);
        return null;
      }
    })
    .filter(Boolean);

  // Helper type guards and extractors
  function eventHasAd(event: ListEvent): boolean {
    return event.isAd === true;
  }
  function eventHasCoords(event: ListEvent): boolean {
    return (
      !eventHasAd(event) &&
      !!event.city &&
      typeof (event.city as { latitude: number; longitude: number })
        .latitude === "number" &&
      typeof (event.city as { latitude: number; longitude: number })
        .longitude === "number"
    );
  }
  function eventGetCoords(
    event: ListEvent
  ): { latitude: number; longitude: number } | null {
    if (eventHasCoords(event)) {
      return {
        latitude: (event.city as { latitude: number; longitude: number })
          .latitude,
        longitude: (event.city as { latitude: number; longitude: number })
          .longitude,
      };
    }
    return null;
  }

  // Event handlers
  const handleLoadMore = useCallback(() => {
    if (isBrowser) {
      setState("scrollPosition", window.scrollY);
      window.gtag?.("event", "load-more-events");
    }

    setIsLoadingMore(true);
    setState("page", page + 1);
  }, [isBrowser, page, setState]);

  const filterEventsByDistance = useCallback(
    (events: ListEvent[], userLocation: UserLocation | null) => {
      const numericDistance =
        typeof distance === "string" ? Number(distance) : distance;
      if (!numericDistance || isNaN(numericDistance)) return events;

      return events.filter((event) => {
        if (eventHasAd(event) || !eventHasCoords(event) || !userLocation) {
          return true;
        }
        const eventCoords = eventGetCoords(event);
        if (!eventCoords) return true;
        const eventDistance = getDistance(
          { lat: userLocation.latitude, lng: userLocation.longitude },
          { lat: eventCoords.latitude, lng: eventCoords.longitude }
        );
        return eventDistance <= numericDistance;
      });
    },
    [distance]
  );

  // Effects
  useEffect(() => {
    if (events.length > 0) {
      setIsLoadingMore(false);
    }
  }, [events]);

  useEffect(() => {
    if (events.length > 0) {
      const filtered = filterEventsByDistance(events, userLocation);
      setFilteredEvents((prevFilteredEvents) => {
        if (JSON.stringify(prevFilteredEvents) !== JSON.stringify(filtered)) {
          return filtered;
        }
        return prevFilteredEvents;
      });
      setIsLoading(false);
    } else {
      setFilteredEvents([]);
      setIsLoading(false);
    }
  }, [events, userLocation, filterEventsByDistance]);

  useEffect(() => {
    if (scrollPosition && divRef.current) {
      divRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [scrollPosition]);

  useEffect(() => {
    const shouldLoad = events.length === 0 && !error && isValidating;
    setIsLoading((prevLoading) =>
      prevLoading !== shouldLoad ? shouldLoad : prevLoading
    );
  }, [events.length, error, isValidating]);

  useEffect(() => {
    if (isBrowser) {
      if (window.performance.navigation.type === 1) {
        setState("scrollPosition", 0);
      } else {
        const storedScrollPosition = scrollPosition;
        if (
          storedScrollPosition !== undefined &&
          storedScrollPosition !== null
        ) {
          window.scrollTo(
            0,
            typeof storedScrollPosition === "string"
              ? parseInt(storedScrollPosition, 10)
              : storedScrollPosition
          );
        }
      }
    }
  }, [isBrowser, scrollPosition, setState]);

  // Page data
  const pageData = serverPageData;

  // Filter to only real events for components that require EventSummaryResponseDTO[]
  const realFilteredEvents = filteredEvents.filter(isEventSummaryResponseDTO);

  // Error handling
  if (error) return <NoEventsFound title={pageData?.notFoundText || ""} />;

  // Render
  return (
    <>
      <Script
        id={`${label || "catalunya"}-${byDate || "all"}-script`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonEvents) }}
      />
      <Meta
        title={pageData?.metaTitle || ""}
        description={pageData?.metaDescription || ""}
        canonical={pageData?.canonical || ""}
      />
      <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
        {notFound && (
          <>
            <div ref={divRef} />
            {isNoEventsFoundVisible && (
              <NoEventsFound
                title={
                  pageData?.notFoundText || "No s'han trobat esdeveniments."
                }
              />
            )}
          </>
        )}
        {!notFound && (
          <>
            <h1 className="uppercase mb-2 px-2">{pageData?.title || ""}</h1>
            <p className="text-[16px] font-normal text-blackCorp text-left mb-10 px-2 font-barlow">
              {pageData?.subTitle || ""}
            </p>
          </>
        )}
        {(isLoading || isValidating) && !isLoadingMore ? (
          <div>
            {[...Array(10)].map((_, i) => (
              <CardLoading key={i} />
            ))}
          </div>
        ) : (
          <List events={realFilteredEvents}>
            {(event: EventSummaryResponseDTO, index: number) => (
              <Card key={event.id} event={event} isPriority={index === 0} />
            )}
          </List>
        )}
        {isLoadingMore && <CardLoading />}
        {!noEventsFound &&
          realFilteredEvents.length > 7 &&
          !isLoadingMore &&
          !allEventsLoaded && (
            <div className="h-12 flex justify-center items-center text-center pt-10 pb-14">
              <button
                type="button"
                className="w-[120px] bg-whiteCorp flex justify-center items-center gap-2 font-barlow italic uppercase tracking-wider font-semibold p-2 border-2 border-bColor rounded-lg hover:bg-primary hover:text-whiteCorp hover:border-whiteCorp ease-in-out duration-300 focus:outline-none"
                onClick={handleLoadMore}
              >
                Carregar més
              </button>
            </div>
          )}
      </div>
    </>
  );
}

export default memo(EventsList);
