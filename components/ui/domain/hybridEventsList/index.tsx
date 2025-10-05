import { ReactElement, memo } from "react";
import { HybridEventsListProps } from "types/props";
import NoEventsFound from "@components/ui/domain/noEventsFound";
import { ListEvent, EventSummaryResponseDTO } from "types/api/event";
import HybridEventsListClient from "./HybridEventsListClient";
import List from "@components/ui/primitives/list";
import { Card, AdArticle, Text } from "@components/ui/primitives";
import { getNewsCta } from "@utils/helpers";
import NewsCta from "@components/ui/domain/newsCta";

// Server wrapper: renders SEO content + initial SSR events (already including ads)
// with no client hydration except where necessary (Card components are still
// client, but wrapper & heading/subtitle remain server-only). Pagination &
// dynamic fetching live in the client enhancer loaded below the fold.

function HybridEventsList({
  initialEvents = [],
  pageData,
  noEventsFound = false,
  place,
  category,
  date,
  serverHasMore = false,
}: HybridEventsListProps): ReactElement {
  const { href: newsHref, text: newsText } = getNewsCta(place);

  if (noEventsFound || initialEvents.length === 0) {
    return (
      <div
        className="mt-page-top w-full flex-col items-center justify-center sm:w-[580px] md:w-[768px] lg:w-[1024px]"
        data-testid="events-list"
      >
        <NoEventsFound title={pageData?.notFoundText} />
        <List events={initialEvents}>
          {(event: ListEvent, index: number) => {
            if ("isAd" in event && event.isAd) {
              return <Card key={`${event.id}-${index}`} type="ad" />;
            }
            return (
              <Card
                key={`${event.id}-${index}`}
                type="event-vertical"
                event={event as EventSummaryResponseDTO}
                isPriority={index === 0}
              />
            );
          }}
        </List>
      </div>
    );
  }

  return (
    <div
      className="mt-page-top w-full flex-col items-center justify-center sm:w-[580px] md:w-[768px] lg:w-[1024px]"
      data-testid="events-list"
    >
      {pageData && (
        <>
          <div className="mt-component-sm gap-section-gap px-container-x md:flex md:items-start md:justify-between lg:px-container-x-lg">
            <Text
              as="h1"
              variant="h1"
              className="pr-xs md:mb-xs mb-component-md flex-1 uppercase leading-tight md:pr-component-md"
            >
              {pageData.title}
            </Text>
            {place && (
              <div className="md:mb-xs md:mt-xs mb-component-lg shrink-0">
                <NewsCta
                  href={newsHref}
                  label={newsText}
                  data-cta="news-inline"
                />
              </div>
            )}
          </div>
          <Text
            variant="body"
            className="mb-component-2xl px-container-x text-left font-barlow text-[16px] font-normal lg:px-container-x-lg"
          >
            {pageData.subTitle}
          </Text>
        </>
      )}

      {/* Initial SSR list with ads (no hydration beyond card internals) */}
      <List events={initialEvents}>
        {(event: ListEvent, index: number) => {
          if ("isAd" in event && event.isAd) {
            return <Card key={`${event.id ?? "ad"}-${index}`} type="ad" />;
          }
          return (
            <Card
              key={`${event.id ?? "ad"}-${index}`}
              type="event-vertical"
              event={event as EventSummaryResponseDTO}
              isPriority={index === 0}
            />
          );
        }}
      </List>

      <AdArticle slot="9643657007" />

      {/* Client enhancer for pagination */}
      <HybridEventsListClient
        initialEvents={initialEvents}
        place={place}
        category={category}
        date={date}
        serverHasMore={serverHasMore}
      />
    </div>
  );
}

export default memo(HybridEventsList);
