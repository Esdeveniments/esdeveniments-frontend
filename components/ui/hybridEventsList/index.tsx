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
import { buildCanonicalUrl } from "@utils/url-filters";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";
import Link from "next/link";

const quickDateLinks = [
  { label: "Què fer avui", byDate: "avui" },
  { label: "Què fer demà", byDate: "dema" },
  { label: "Què fer aquesta setmana", byDate: "setmana" },
  { label: "Què fer aquest cap de setmana", byDate: "cap-de-setmana" },
] as const;

const quickCategoryLinks = [
  { label: "Plans amb nens", category: "familia-i-infants" },
  { label: "Concerts i música", category: "musica" },
  { label: "Teatre i arts escèniques", category: "teatre" },
] as const;

const quickSearchLinks = [
  { label: "Plans gratis o low-cost", searchTerm: "gratis" },
] as const;

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
  const normalizedDate = date && date.length > 0 ? date : DEFAULT_FILTER_VALUE;
  const normalizedCategory =
    category && category.length > 0 ? category : DEFAULT_FILTER_VALUE;

  const buildLink = (options: {
    byDate?: string;
    category?: string;
    searchTerm?: string;
  }) =>
    buildCanonicalUrl(
      {
        place,
        byDate: options.byDate ?? normalizedDate,
        category:
          options.category ??
          (options.searchTerm ? DEFAULT_FILTER_VALUE : normalizedCategory),
        searchTerm: options.searchTerm,
      },
      categories
    );

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

      {place && (
        <nav
          className="sr-only"
          aria-label={`Enllaços destacats per ${placeLabel || place}`}
        >
          <div>
            <p className="font-semibold">Dates ràpides</p>
            <ul>
              {quickDateLinks.map((link) => (
                <li key={link.byDate}>
                  <Link href={buildLink({ byDate: link.byDate })}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold">Plans populars</p>
            <ul>
              {quickCategoryLinks.map((link) => (
                <li key={link.category}>
                  <Link href={buildLink({ category: link.category })}>
                    {link.label}
                  </Link>
                </li>
              ))}
              {quickSearchLinks.map((link) => (
                <li key={link.searchTerm}>
                  <Link href={buildLink({ searchTerm: link.searchTerm })}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
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
