import { ReactElement, memo } from "react";
import { HybridEventsListProps } from "types/props";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { ListEvent } from "types/api/event";
import HybridEventsListClient from "./HybridEventsListClient";
import List from "@components/ui/list";
import Card from "@components/ui/card";
import { getNewsCta } from "@utils/helpers";
import NewsCta from "@components/ui/newsCta";
import AdArticle from "../adArticle";

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
        className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32"
        data-testid="events-list"
      >
        <NoEventsFound title={pageData?.notFoundText} />
        <List events={initialEvents}>
          {(event: ListEvent, index: number) => (
            <Card
              key={`${event.id}-${index}`}
              event={event}
              isPriority={index === 0}
            />
          )}
        </List>
      </div>
    );
  }

  return (
    <div
      className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-32"
      data-testid="events-list"
    >
      {pageData && (
        <>
          <div className="px-2 mt-2 md:flex md:items-start md:justify-between gap-4">
            <h1 className="uppercase mb-3 md:mb-0 leading-tight pr-1 md:pr-4 flex-1">
              {pageData.title}
            </h1>
            {place && (
              <div className="mb-4 md:mb-0 md:mt-0 shrink-0">
                <NewsCta
                  href={newsHref}
                  label={newsText}
                  data-cta="news-inline"
                />
              </div>
            )}
          </div>
          <p className="text-[16px] font-normal text-blackCorp text-left mb-8 px-2 font-barlow">
            {pageData.subTitle}
          </p>
        </>
      )}

      {/* Initial SSR list with ads (no hydration beyond card internals) */}
      <List events={initialEvents}>
        {(event: ListEvent, index: number) => (
          <Card
            key={`${event.id ?? "ad"}-${index}`}
            event={event}
            isPriority={index === 0}
          />
        )}
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
