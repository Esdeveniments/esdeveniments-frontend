import { memo, ReactElement } from "react";
import Script from "next/script";
import List from "@components/ui/list";
import Card from "@components/ui/card";
import { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { generateJsonData } from "@utils/helpers";
import { ServerEventsListProps } from "types/props";

function ServerEventsList({
  events = [],
  placeTypeLabel,
  pageData,
  noEventsFound = false,
  nonce = "",
}: ServerEventsListProps): ReactElement {
  // Filter out ads and invalid events
  const validEvents = events.filter(
    isEventSummaryResponseDTO
  ) as EventSummaryResponseDTO[];

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
          id={`events-list-${placeTypeLabel?.label || "all"}-${
            validEvents.length
          }`}
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonEvents) }}
        />
      )}

      <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32">
        {/* SEO Content */}
        {pageData && (
          <>
            <h1 className="uppercase mb-2 px-2  lg:px-0">{pageData.title}</h1>
            <p className="text-[16px] font-normal text-blackCorp text-left mb-10 px-2 font-barlow">
              {pageData.subTitle}
            </p>
          </>
        )}

        {/* Events List */}
        <List events={validEvents as ListEvent[]}>
          {(event: ListEvent, index: number) => (
            <Card
              key={`${event.id}-${index}`}
              event={event}
              isPriority={index === 0}
            />
          )}
        </List>
      </div>
    </>
  );
}

export default memo(ServerEventsList);
