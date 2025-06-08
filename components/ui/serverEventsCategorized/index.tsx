import { memo, ReactElement } from "react";
import Script from "next/script";
import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import EventsHorizontalScroll from "@components/ui/eventsHorizontalScroll";
import { CATEGORY_NAMES_MAP } from "@utils/constants";
import type { PageData } from "types/common";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { ListEvent, EventSummaryResponseDTO } from "types/api/event";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { generateJsonData } from "@utils/helpers";

interface ServerEventsCategorizedProps {
  categorizedEvents: Record<string, ListEvent[]>;
  pageData?: PageData;
}

function ServerEventsCategorized({
  categorizedEvents,
  pageData,
}: ServerEventsCategorizedProps): ReactElement {
  // Filter out ads before processing
  const filteredCategorizedEvents = Object.entries(categorizedEvents).reduce(
    (acc, [category, events]) => {
      const filteredEvents = events.filter(isEventSummaryResponseDTO);
      if (filteredEvents.length > 0) {
        acc[category] = filteredEvents;
      }
      return acc;
    },
    {} as Record<string, ListEvent[]>
  );

  const allEvents = Object.values(filteredCategorizedEvents).flat();
  const hasEvents = allEvents.length > 0;
  
  // Generate JSON-LD data for all events (limited to first 50 for performance)
  const jsonEvents = (allEvents as EventSummaryResponseDTO[])
    .slice(0, 50)
    .map((event) => {
      try {
        return generateJsonData(event);
      } catch (err) {
        console.error("Error generating JSON data for event:", event.id, err);
        return null;
      }
    })
    .filter(Boolean);

  if (!hasEvents) {
    return <NoEventsFound />;
  }

  return (
    <>
      {/* JSON-LD Schema for SEO */}
      {jsonEvents.length > 0 && (
        <Script
          id={`categorized-events-${Object.keys(filteredCategorizedEvents).join('-')}-${allEvents.length}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonEvents) }}
        />
      )}
      
      {/* SEO Content */}
      {pageData && (
        <div className="w-full px-4 mb-6 max-w-4xl mx-auto mt-32">
          <h1 className="text-2xl font-bold mb-2">
            {pageData.title}
          </h1>
          <p className="text-gray-700 leading-relaxed">
            {pageData.subTitle}
          </p>
        </div>
      )}
      
      <div className="w-full bg-whiteCorp flex flex-col justify-center items-center overflow-hidden">
        <div className="w-full flex flex-col justify-center items-center gap-4 sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
          {Object.entries(filteredCategorizedEvents).map(
            ([category, events]) => {
              const categoryName =
                CATEGORY_NAMES_MAP[
                  category as keyof typeof CATEGORY_NAMES_MAP
                ] || category;

              return (
                <div
                  key={category}
                  className="w-full flex flex-col justify-center items-center gap-4"
                >
                  {/* Category Header */}
                  <div className="w-full flex justify-between items-center px-4">
                    <h2 className="text-xl font-bold capitalize">
                      {categoryName}
                    </h2>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  </div>

                  {/* Events Horizontal Scroll */}
                  <EventsHorizontalScroll events={events as any} />

                  {/* Ad placement removed for server component - can be added via client component */}
                </div>
              );
            }
          )}
        </div>
      </div>
    </>
  );
}

export default memo(ServerEventsCategorized);
