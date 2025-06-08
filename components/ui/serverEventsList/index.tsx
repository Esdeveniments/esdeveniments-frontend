import { memo, ReactElement } from "react";
import Script from "next/script";
import List from "@components/ui/list";
import Card from "@components/ui/card";
import { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import { PageData, PlaceTypeAndLabel } from "types/common";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { generateJsonData } from "@utils/helpers";

interface ServerEventsListProps {
  events: ListEvent[];
  placeTypeLabel?: PlaceTypeAndLabel;
  pageData?: PageData;
  noEventsFound?: boolean;
}

function ServerEventsList({
  events = [],
  placeTypeLabel,
  pageData,
  noEventsFound = false,
}: ServerEventsListProps): ReactElement {

  // Filter out ads and invalid events
  const validEvents = events.filter(isEventSummaryResponseDTO) as EventSummaryResponseDTO[];
  
  // Generate JSON-LD data for SEO
  const jsonEvents = validEvents
    .map((event) => {
      try {
        return generateJsonData(event);
      } catch (err) {
        console.error("Error generating JSON data for event:", event.id, err);
        return null;
      }
    })
    .filter(Boolean);

  if (noEventsFound || validEvents.length === 0) {
    return <NoEventsFound />;
  }

  return (
    <>
      {/* JSON-LD Schema for SEO */}
      {jsonEvents.length > 0 && (
        <Script
          id={`events-list-${placeTypeLabel?.label || 'all'}-${validEvents.length}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonEvents) }}
        />
      )}
      
      <div className="w-full bg-whiteCorp flex flex-col justify-center items-center overflow-hidden">
        <div className="w-full flex flex-col justify-center items-center gap-4 sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
          {/* SEO Content */}
          {pageData && (
            <div className="w-full px-4 mb-6">
              <h1 className="text-2xl font-bold mb-2">
                {pageData.title}
              </h1>
              <p className="text-gray-700 leading-relaxed">
                {pageData.subTitle}
              </p>
            </div>
          )}
          
          {/* Events List */}
          <List events={validEvents}>
            {(event: EventSummaryResponseDTO, index: number) => (
              <Card
                key={`${event.id}-${index}`}
                event={event}
              />
            )}
          </List>
        </div>
      </div>
    </>
  );
}

export default memo(ServerEventsList);