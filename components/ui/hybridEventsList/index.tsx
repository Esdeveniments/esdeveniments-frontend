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

function HybridEventsList({
  initialEvents = [],
  pageData,
  noEventsFound = false,
  place,
  placeTypeLabel,
  category,
  date,
  serverHasMore = false,
  hasNews = false,
  categories,
}: HybridEventsListProps): ReactElement {
  const placeLabel = placeTypeLabel?.label;
  const placeType =
    placeTypeLabel?.type === "town"
      ? "town"
      : placeTypeLabel?.type === "region"
      ? "region"
      : undefined;
  const { href: newsHref, text: newsText } = getNewsCta(
    place,
    placeLabel,
    placeType
  );
  const titleClass = place ? "heading-2" : "heading-1";
  const subtitleClass = place ? "body-normal" : "body-large";

  if (noEventsFound || initialEvents.length === 0) {
    return (
      <div
        className="container flex-col justify-center items-center mt-sticky-offset"
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
      className="container flex-col justify-center items-center mt-sticky-offset"
      data-testid="events-list"
    >
      {pageData && (
        <>
          <div className="px-section-x mt-element-gap md:flex md:items-start md:justify-between gap-element-gap">
            <h1 className={`${titleClass} flex-1`}>{pageData.title}</h1>
            {place && hasNews && (
              <div className="mb-4 md:mb-0 md:mt-0 shrink-0">
                <NewsCta
                  href={newsHref}
                  label={newsText}
                  data-cta="news-inline"
                />
              </div>
            )}
          </div>
          <p
            className={`${subtitleClass} text-left mb-element-gap px-section-x`}
          >
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
        categories={categories}
      />
    </div>
  );
}

export default memo(HybridEventsList);
