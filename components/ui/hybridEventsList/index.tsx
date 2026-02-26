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
import SponsorBannerSlot from "@components/ui/sponsor/SponsorBannerSlot";

async function HybridEventsList({
  initialEvents = [],
  pageData,
  noEventsFound = false,
  place,
  category,
  date,
  profileSlug,
  serverHasMore = false,
  categories,
}: HybridEventsListProps): Promise<ReactElement> {
  const titleClass = place ? "heading-2" : "heading-1";
  const subtitleClass = place ? "body-normal" : "body-large";

  // Common heading section rendered for all cases
  const headingSection = pageData && (
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
  );

  // Sponsor banner slot - shows active sponsor or CTA to advertise
  const sponsorSlot = <SponsorBannerSlot place={place || "catalunya"} />;

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
        {headingSection}
        {sponsorSlot}
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
      {headingSection}
      {sponsorSlot}

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
        profileSlug={profileSlug}
        serverHasMore={serverHasMore}
        categories={categories}
        pageData={pageData}
      />
    </div>
  );
}

export default HybridEventsList;
