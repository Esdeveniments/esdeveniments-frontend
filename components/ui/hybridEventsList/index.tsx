import { ReactElement, Suspense } from "react";
import { HybridEventsListProps } from "types/props";
import NoEventsFound from "@components/ui/common/noEventsFound";
import HybridEventsListClient from "./HybridEventsListClient";
import SearchRecoveryLinks from "./SearchRecoveryLinks";
import EventCardList from "@components/ui/card/EventCardList";
import AdArticle from "../adArticle";
import SsrListWrapper from "./SsrListWrapper";
import SearchAwareHeading from "./SearchAwareHeading";
import CountLine from "./CountLine";
import HeadingLayout from "./HeadingLayout";
import SponsorBannerSlot from "@components/ui/sponsor/SponsorBannerSlot";
import { hasCardImage } from "@utils/event-helpers";
import { buildEventMapPoints } from "@utils/event-map";
import { ListingEventsProvider } from "@components/context/ListingEventsContext";
import EventsMapToggle from "@components/ui/eventsMap/EventsMapToggle";

async function HybridEventsList({
  initialEvents = [],
  pageData,
  noEventsFound = false,
  place,
  category,
  date,
  profileSlug,
  serverHasMore = false,
  ssrPageSize,
  categories,
  promotedSlot,
  countLine,
}: HybridEventsListProps): Promise<ReactElement> {
  const priorityIndex = initialEvents.findIndex(hasCardImage);
  const showMap = buildEventMapPoints(initialEvents).length >= 2;
  const titleClass = place ? "heading-2" : "heading-1";
  const subtitleClass = place ? "body-normal" : "body-large";

  // Common heading section rendered for all cases
  const headingSection = pageData && (
    <>
      <div data-server-heading>
        <HeadingLayout
          title={pageData.title}
          subtitle={
            countLine ? (
              <>
                <CountLine text={countLine} />
                {pageData.subTitle}
              </>
            ) : (
              pageData.subTitle
            )
          }
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
        {promotedSlot}
        {sponsorSlot}
        <NoEventsFound
          title={pageData?.notFoundTitle}
          description={pageData?.notFoundDescription}
        >
          {/* The client list doesn't mount here, so a search shows its
              recovery links from this branch. */}
          {profileSlug ? null : (
            <Suspense fallback={null}>
              <SearchRecoveryLinks />
            </Suspense>
          )}
        </NoEventsFound>
        <EventCardList
          events={initialEvents}
          priorityIndex={priorityIndex}
          headingLevel="h2"
        />
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
      {promotedSlot}
      {sponsorSlot}

      <ListingEventsProvider>
        {/* One town bubble alone is no map: show it from two places. */}
        {showMap ? <EventsMapToggle /> : null}

        {/* Initial SSR list with ads (no hydration beyond card internals).
            Hidden when client filters are active (SsrListWrapper). No Suspense
            here: SsrListWrapper reads the shared URL filters context, and a
            fallback that repeated the list sent every card twice in the HTML. */}
        <SsrListWrapper categories={categories}>
          <EventCardList
            events={initialEvents}
            priorityIndex={priorityIndex}
            headingLevel="h2"
          />
          <AdArticle slot="9643657007" />
        </SsrListWrapper>

        {/* Client enhancer for pagination */}
        <HybridEventsListClient
          initialEvents={initialEvents}
          place={place}
          category={category}
          date={date}
          profileSlug={profileSlug}
          serverHasMore={serverHasMore}
          ssrPageSize={ssrPageSize}
          categories={categories}
          pageData={pageData}
        />
      </ListingEventsProvider>
    </div>
  );
}

export default HybridEventsList;
