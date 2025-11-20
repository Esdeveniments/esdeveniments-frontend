import { ReactElement, memo, Suspense } from "react";
import { HybridEventsListProps } from "types/props";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { ListEvent } from "types/api/event";
import HybridEventsListClient from "./HybridEventsListClient";
import List from "@components/ui/list";
import Card from "@components/ui/card";
import { getNewsCta } from "@utils/helpers";
import NewsCta from "@components/ui/newsCta";
import AdArticle from "../adArticle";
import SsrListWrapper from "./SsrListWrapper";
import SearchAwareHeading from "./SearchAwareHeading";

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
  const newsCta =
    place && hasNews && newsHref && newsText ? (
      <div className="mb-4 md:mb-0 md:mt-0 shrink-0 px-element-gap">
        <NewsCta href={newsHref} label={newsText} data-cta="news-inline" />
      </div>
    ) : null;

  if (noEventsFound || initialEvents.length === 0) {
    return (
      <div
        className="container flex-col justify-center items-center mt-sticky-offset"
        data-testid="events-list"
      >
        <NoEventsFound
          title={pageData?.notFoundTitle}
          description={pageData?.notFoundDescription}
        />
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
        <Suspense
          fallback={
            <>
              <div className="px-section-x mt-element-gap mb-element-gap md:flex md:items-start md:justify-between gap-element-gap">
                <h1 className={`${titleClass} flex-1`}>{pageData.title}</h1>
                {newsCta}
              </div>
              <p
                className={`${subtitleClass} text-left mb-element-gap px-section-x`}
              >
                {pageData.subTitle}
              </p>
            </>
          }
        >
          <SearchAwareHeading
            pageData={pageData}
            categories={categories}
            titleClass={titleClass}
            subtitleClass={subtitleClass}
            cta={newsCta}
          />
        </Suspense>
      )}

      {/* Initial SSR list with ads (no hydration beyond card internals) */}
      {/* Hidden when client filters are active (handled declaratively by SsrListWrapper) */}
      {/* Wrapped in Suspense because SsrListWrapper uses useSearchParams() */}
      {/* Fallback renders SSR content directly to ensure SEO visibility */}
      <Suspense
        fallback={
          <div data-ssr-list-wrapper>
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
          </div>
        }
      >
        <SsrListWrapper categories={categories}>
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
        </SsrListWrapper>
      </Suspense>

      {/* Client enhancer for pagination */}
      <HybridEventsListClient
        initialEvents={initialEvents}
        place={place}
        category={category}
        date={date}
        serverHasMore={serverHasMore}
        categories={categories}
        pageData={pageData}
      />
    </div>
  );
}

export default memo(HybridEventsList);
