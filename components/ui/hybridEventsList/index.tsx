import { ReactElement, Suspense } from "react";
import { HybridEventsListProps } from "types/props";
import NoEventsFound from "@components/ui/common/noEventsFound";
import { ListEvent } from "types/api/event";
import HybridEventsListClient from "./HybridEventsListClient";
import List from "@components/ui/list";
import CardServer from "@components/ui/card/CardServer";
import AdArticle from "../adArticle";
import SsrListWrapper from "./SsrListWrapper";
import SearchAwareHeading from "./SearchAwareHeading";
import HeadingLayout from "./HeadingLayout";
import { SponsorBannerSlot } from "@components/ui/sponsor";

async function HybridEventsList({
  initialEvents = [],
  pageData,
  noEventsFound = false,
  place,
  category,
  date,
  serverHasMore = false,
  categories,
}: HybridEventsListProps): Promise<ReactElement> {
  const titleClass = place ? "heading-2" : "heading-1";
  const subtitleClass = place ? "body-normal" : "body-large";

  if (noEventsFound || initialEvents.length === 0) {
    return (
      <div
        className="container flex-col justify-center items-center pt-[6rem]"
        data-testid="events-list"
        data-analytics-container="true"
        data-analytics-context="events_list"
        data-analytics-place-slug={place || undefined}
        data-analytics-category-slug={category || undefined}
        data-analytics-date-slug={date || undefined}
      >
        {pageData && (
          <>
            <div data-server-heading>
              <HeadingLayout
                title={pageData.title}
                subtitle={pageData.subTitle}
                titleClass={titleClass}
                subtitleClass={subtitleClass}
              />
            </div>
            <Suspense fallback={null}>
              <SearchAwareHeading
                pageData={pageData}
                categories={categories}
                titleClass={titleClass}
                subtitleClass={subtitleClass}
              />
            </Suspense>
          </>
        )}

        {/* Sponsor banner slot - shows active sponsor or CTA to advertise */}
        <SponsorBannerSlot place={place || "catalunya"} />

        <NoEventsFound
          title={pageData?.notFoundTitle}
          description={pageData?.notFoundDescription}
        />
        <List events={initialEvents}>
          {(event: ListEvent, index: number) => (
            <CardServer
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
      className="container flex-col justify-center items-center pt-[6rem]"
      data-testid="events-list"
      data-analytics-container="true"
      data-analytics-context="events_list"
      data-analytics-place-slug={place || undefined}
      data-analytics-category-slug={category || undefined}
      data-analytics-date-slug={date || undefined}
    >
      {pageData && (
        <>
          {/* Always render H1 directly in server component for SEO - ensures it's in initial HTML */}
          {/* aria-hidden will be set by SearchAwareHeading when search query is present */}
          <div data-server-heading>
            <HeadingLayout
              title={pageData.title}
              subtitle={pageData.subTitle}
              titleClass={titleClass}
              subtitleClass={subtitleClass}
            />
          </div>
          {/* Client-side enhancement: conditionally replace heading when search query is present */}
          <Suspense fallback={null}>
            <SearchAwareHeading
              pageData={pageData}
              categories={categories}
              titleClass={titleClass}
              subtitleClass={subtitleClass}
            />
          </Suspense>
        </>
      )}

      {/* Sponsor banner slot - shows active sponsor or CTA to advertise */}
      <SponsorBannerSlot place={place || "catalunya"} />

      {/* Initial SSR list with ads (no hydration beyond card internals) */}
      {/* Hidden when client filters are active (handled declaratively by SsrListWrapper) */}
      {/* Wrapped in Suspense because SsrListWrapper uses useSearchParams() */}
      {/* Fallback renders SSR content directly to ensure SEO visibility */}
      <Suspense
        fallback={
          <div data-ssr-list-wrapper>
            <List events={initialEvents}>
              {(event: ListEvent, index: number) => (
                <CardServer
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
              <CardServer
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

export default HybridEventsList;
