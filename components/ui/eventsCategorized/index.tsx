import { memo, useCallback, useEffect, useState, ReactElement } from "react";
import Script from "next/script";
import dynamic from "next/dynamic";
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import SpeakerphoneIcon from "@heroicons/react/outline/SpeakerphoneIcon";
import Meta from "@components/partials/seo-meta";
import { useGetCategorizedEvents } from "@components/hooks/useGetCategorizedEvents";
import { generateJsonData, sendEventToGA } from "@utils/helpers";
import List from "@components/ui/list";
import CardLoading from "@components/ui/cardLoading";
import Card from "@components/ui/card";
import EventsHorizontalScroll from "@components/ui/eventsHorizontalScroll";
import { CATEGORY_NAMES_MAP } from "@utils/constants";
import useStore, { EventCategory } from "@store";
import { ByDateOptions, PageData } from "types/common";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";

const NoEventsFound = dynamic(
  () => import("@components/ui/common/noEventsFound"),
  {
    loading: () => null,
  }
);

const AdArticle = dynamic(() => import("@components/ui/adArticle"), {
  loading: () => null,
  ssr: false,
});

interface EventsCategorizedProps {
  pageData: PageData;
}

function EventsCategorized({ pageData }: EventsCategorizedProps): ReactElement {
  const {
    categorizedEvents: initialCategorizedEvents,
    latestEvents: initialLatestEvents,
    place,
    byDate,
    setState,
  } = useStore((state) => ({
    categorizedEvents: state.categorizedEvents,
    latestEvents: state.latestEvents,
    place: state.place,
    byDate: state.byDate as ByDateOptions,
    currentYear: state.currentYear,
    setState: state.setState,
  }));

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter out ads before passing to hook props
  const safeInitialCategorizedEvents = Object.fromEntries(
    Object.entries(initialCategorizedEvents).map(([category, events]) => [
      category,
      events.filter(isEventSummaryResponseDTO),
    ])
  );
  const safeInitialLatestEvents = initialLatestEvents.filter(
    isEventSummaryResponseDTO
  );

  const {
    data: fetchedData,
    isValidating,
    error,
  } = useGetCategorizedEvents({
    props: {
      categorizedEvents: safeInitialCategorizedEvents,
      latestEvents: safeInitialLatestEvents,
    },
    // Removed searchTerms and maxResults as they are not supported by the backend endpoint
  });

  const categorizedEvents =
    fetchedData?.categorizedEvents || safeInitialCategorizedEvents;
  const latestEvents = fetchedData?.latestEvents || safeInitialLatestEvents;

  const scrollToTop = useCallback((): void => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const onCategoryClick = useCallback(
    (category: string): void => {
      setState("category", category as EventCategory);
      sendEventToGA("Category", category);
      scrollToTop();
    },
    [setState, scrollToTop]
  );

  // Effects
  useEffect(() => {
    const shouldLoad =
      Object.keys(categorizedEvents).length === 0 && !error && !isValidating;
    setIsLoading((prevLoading) =>
      prevLoading !== shouldLoad ? shouldLoad : prevLoading
    );
  }, [categorizedEvents, error, isValidating]);

  // --- SEO/Meta and JSON-LD Structured Data ---
  // Generate eventKeys for JSON-LD
  const eventKeys = Object.keys(categorizedEvents || {});
  const jsonEvents = [
    ...eventKeys
      .flatMap((category) => categorizedEvents[category] || [])
      .map((event) => {
        try {
          return generateJsonData(event);
        } catch (err) {
          console.error("Error generating JSON data for event:", err, event);
          return null;
        }
      })
      .filter(Boolean),
    ...latestEvents
      .map((event) => {
        try {
          return generateJsonData(event);
        } catch (err) {
          console.error(
            "Error generating JSON data for latest event:",
            err,
            event
          );
          return null;
        }
      })
      .filter(Boolean),
  ];

  const {
    metaTitle,
    metaDescription,
    title,
    subTitle,
    canonical,
    notFoundText,
  } = pageData;

  const getCategoryName = (category: string): string => {
    return Object.entries(CATEGORY_NAMES_MAP).reduce(
      (acc, [key, value]) => (key === category ? value : acc),
      category
    );
  };

  // Filter out ads before using as CategorizedEvents
  const safeCategorizedEvents = Object.fromEntries(
    Object.entries(categorizedEvents).map(([category, events]) => [
      category,
      events.filter(isEventSummaryResponseDTO),
    ])
  );

  // Error handling
  if (error) return <NoEventsFound title={notFoundText} />;

  // Render
  return (
    <>
      {/* JSON-LD structured data for SEO */}
      <Script
        id={`${place || "catalunya"}-${byDate || "all"}-script`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonEvents) }}
      />
      {/* SEO meta tags */}
      <Meta
        title={metaTitle}
        description={metaDescription}
        canonical={canonical}
      />
      <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
        <>
          <h1 className="uppercase mb-2 px-2">{title}</h1>
          <p className="text-[16px] font-normal text-blackCorp text-left px-2 font-barlow">
            {subTitle}
          </p>
        </>
        {isLoading || isValidating ? (
          <>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="mt-9 ml-2">
                <div className="w-10/12 flex justify-start items-center animate-fast-pulse mb-4">
                  <div className="w-2/3 h-5 bg-darkCorp rounded-xl"></div>
                </div>
                <div className="mt-0.5">
                  <CardLoading key={i} />
                </div>
              </div>
            ))}
          </>
        ) : error ? (
          <div className="error">Failed to load events.</div>
        ) : Object.entries(safeCategorizedEvents).length === 0 ? (
          <NoEventsFound />
        ) : (
          <div className="p-2">
            {Object.entries(safeCategorizedEvents).map(
              ([category, events], index) => {
                // Priority rendering logic (first two categories)
                const shouldUsePriority = index < 2;
                return events.length > 0 ? (
                  <div key={category}>
                    <div className="flex justify-between mt-4 mb-2">
                      <h2 className="font-semibold">
                        {getCategoryName(category)}
                      </h2>
                      <div
                        className="flex justify-between items-center cursor-pointer text-primary"
                        onClick={() => onCategoryClick(category)}
                      >
                        <div className="flex items-center">
                          Veure més
                          <ChevronRightIcon className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                    <EventsHorizontalScroll
                      events={events}
                      usePriority={shouldUsePriority}
                    />
                    {/* Ad block after certain categories */}
                    {(index === 1 || index === 3) && (
                      <div className="w-full h-full flex flex-col items-start min-h-[250px] max-w-lg gap-2 mt-4 mb-2">
                        <div className="w-full flex">
                          <SpeakerphoneIcon className="w-5 h-5 mt-1 mr-2" />
                          <div className="w-11/12 flex flex-col gap-4">
                            <h2>Contingut patrocinat</h2>
                          </div>
                        </div>
                        <div className="w-full">
                          <AdArticle slot="8139041285" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : null;
              }
            )}
            {latestEvents.length > 0 && (
              <>
                <h2 className="font-semibold mt-4 mb-6">
                  Últims esdeveniments
                </h2>
                <List events={latestEvents}>
                  {(event) => (
                    <Card key={event.id} event={event} isPriority={false} />
                  )}
                </List>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default memo(EventsCategorized);
