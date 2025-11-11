// No headers/nonce needed with relaxed CSP
import Link from "next/link";
import {
  generateJsonData,
  getFormattedDate,
  formatCatalanA,
} from "@utils/helpers";
import { siteUrl } from "@config/index";
import { fetchEvents } from "@lib/api/events";
import { getPlaceBySlug } from "@lib/api/places";
import { getHistoricDates } from "@lib/dates";
import dynamic from "next/dynamic";
import type { MonthStaticPathParams } from "types/common";
import type { EventSummaryResponseDTO } from "types/api/event";
import {
  buildPageMeta,
  generateCollectionPageSchema,
  generateItemListStructuredData,
} from "@components/partials/seo-meta";
import { SitemapLayout, SitemapBreadcrumb } from "@components/ui/sitemap";

export const revalidate = 86400;

const NoEventsFound = dynamic(
  () => import("@components/ui/common/noEventsFound")
);

export async function generateMetadata({
  params,
}: {
  params: Promise<MonthStaticPathParams>;
}) {
  const { town, year, month } = await params;
  const place = await getPlaceBySlug(town);
  const townLabel = place?.name || town;
  const placeType: "region" | "town" =
    place?.type === "CITY" ? "town" : "region";
  const locationPhrase = formatCatalanA(townLabel, placeType, false);

  let textMonth = month;
  if (month === "marc") textMonth = month.replace("c", "ç");
  return buildPageMeta({
    title: `Arxiu de ${townLabel} del ${textMonth} del ${year} - Esdeveniments.cat`,
    description: `Descobreix què va passar ${locationPhrase} el ${textMonth} del ${year}. Teatre, cinema, música, art i altres excuses per no parar de descobrir ${townLabel} - Arxiu - Esdeveniments.cat`,
    canonical: `${siteUrl}/sitemap/${town}/${year}/${month}`,
  });
}

export default async function Page({
  params,
}: {
  params: Promise<MonthStaticPathParams>;
}) {
  const { town, year, month } = await params;
  if (!town || !year || !month) return null;

  const { from, until } = getHistoricDates(month, Number(year));

  const [events, place] = await Promise.all([
    fetchEvents({
      place: town,
      from: from.toISOString().split("T")[0],
      to: until.toISOString().split("T")[0],
      size: 2500,
    }),
    getPlaceBySlug(town),
  ]);
  const townLabel = place?.name || town;
  const placeType: "region" | "town" =
    place?.type === "CITY" ? "town" : "region";
  const locationPhrase = formatCatalanA(townLabel, placeType, false);

  let textMonth = month;
  if (month === "marc") textMonth = month.replace("c", "ç");

  const filteredEvents = Array.isArray(events.content)
    ? (events.content as EventSummaryResponseDTO[]).filter(
        (event) => !event.isAd
      )
    : [];

  // Generate event JSON-LD data
  const jsonData = filteredEvents
    ? filteredEvents
        .map((event) => generateJsonData(event))
        .filter((data) => data !== null)
    : [];

  // Generate structured data for the month archive
  const breadcrumbs = [
    { name: "Inici", url: siteUrl },
    { name: "Arxiu", url: `${siteUrl}/sitemap` },
    { name: townLabel, url: `${siteUrl}/sitemap/${town}` },
    {
      name: `${textMonth} ${year}`,
      url: `${siteUrl}/sitemap/${town}/${year}/${month}`,
    },
  ];

  // Generate ItemList for events if available
  const eventsItemList =
    filteredEvents.length > 0
      ? generateItemListStructuredData(
          filteredEvents,
          `Esdeveniments de ${townLabel} - ${textMonth} ${year}`,
          `Col·lecció d'esdeveniments culturals de ${townLabel} del ${textMonth} del ${year}`
        )
      : null;

  // Generate collection page schema
  const collectionPageSchema = generateCollectionPageSchema({
    title: `Arxiu de ${townLabel} - ${textMonth} ${year}`,
    description: `Esdeveniments culturals que van tenir lloc ${locationPhrase} durant el ${textMonth} del ${year}`,
    url: `${siteUrl}/sitemap/${town}/${year}/${month}`,
    breadcrumbs,
    numberOfItems: filteredEvents.length,
    mainEntity: eventsItemList || {
      "@type": "Thing",
      name: `Esdeveniments de ${townLabel} - ${textMonth} ${year}`,
      description: "Col·lecció d'esdeveniments culturals",
    },
  });

  return (
    <>
      {/* Individual Events JSON-LD - kept for backward compatibility */}
      {jsonData.length > 0 && (
        <script
          id={`${town}-${month}-${year}-events`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonData).replace(/</g, "\\u003c"),
          }}
        />
      )}

      {/* Enhanced Collection Page Schema */}
      <script
        id={`${town}-${month}-${year}-collection`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionPageSchema).replace(/</g, "\\u003c"),
        }}
      />

      {/* Enhanced Events ItemList Schema */}
      {eventsItemList && (
        <script
          id={`${town}-${month}-${year}-itemlist`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(eventsItemList).replace(/</g, "\\u003c"),
          }}
        />
      )}

      <SitemapLayout>
        <SitemapBreadcrumb items={breadcrumbs} />

        <header className="text-center">
          <h1 className="heading-2 mb-2">
            Arxiu {townLabel} - {textMonth} del {year}
          </h1>
          <p className="body-normal text-foreground/80">
            {filteredEvents.length > 0
              ? `${filteredEvents.length} esdeveniments culturals documentats`
              : `No s'han trobat esdeveniments per aquest període`}
          </p>
        </header>

        <section className="w-full">
          {filteredEvents.length > 0 ? (
            <div className="stack gap-4">
              <h2 className="sr-only">Llista d&apos;esdeveniments</h2>
              {filteredEvents.map((event: EventSummaryResponseDTO) => {
                const { formattedStart, formattedEnd } = getFormattedDate(
                  event.startDate,
                  event.endDate
                );
                return (
                  <article
                    key={event.id}
                    className="border-b border-border/30 pb-4 w-full"
                  >
                    <Link
                      href={`/e/${event.slug}`}
                      prefetch={false}
                      className="hover:text-primary block group"
                    >
                      <h3 className="heading-4 group-hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 body-small text-foreground/80 mt-1">
                        <time dateTime={event.startDate}>
                          {formattedEnd
                            ? `${formattedStart} - ${formattedEnd}`
                            : `${formattedStart}`}
                        </time>
                        {event.location && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span>{event.location}</span>
                          </>
                        )}
                        {event.categories && event.categories.length > 0 && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-primary">
                              {event.categories[0].name}
                            </span>
                          </>
                        )}
                      </div>
                      {event.description && (
                        <p className="body-small text-foreground mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <NoEventsFound />
          )}
        </section>

        {filteredEvents.length > 0 && (
          <footer className="pt-8 border-t border-border text-center">
            <p className="body-small text-foreground/80 mb-4">
              Vols explorar més esdeveniments de {townLabel}?
            </p>
            <div className="flex-center gap-4">
              <Link
                href={`/sitemap/${town}`}
                className="text-primary hover:text-primary-dark body-small transition-colors"
              >
                Veure tots els arxius
              </Link>
              <Link
                href={`/${town}`}
                className="text-primary hover:text-primary-dark body-small transition-colors"
              >
                Esdeveniments actuals
              </Link>
            </div>
          </footer>
        )}
      </SitemapLayout>
    </>
  );
}
