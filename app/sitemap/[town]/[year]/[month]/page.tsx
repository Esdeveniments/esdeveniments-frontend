import Script from "next/script";
import { headers } from "next/headers";
import Link from "next/link";
import { generateJsonData, getFormattedDate } from "@utils/helpers";
import { siteUrl } from "@config/index";
import { fetchEvents } from "@lib/api/events";
import { fetchPlaceBySlug } from "@lib/api/places";
import { getHistoricDates } from "@lib/dates";
import dynamic from "next/dynamic";
import type { MonthStaticPathParams } from "types/common";
import type { EventSummaryResponseDTO } from "types/api/event";
import {
  buildPageMeta,
  generateCollectionPageSchema,
  generateItemListStructuredData,
} from "@components/partials/seo-meta";

const NoEventsFound = dynamic(
  () => import("@components/ui/common/noEventsFound")
);

export async function generateMetadata({
  params,
}: {
  params: Promise<MonthStaticPathParams>;
}) {
  const { town, year, month } = await params;
  const place = await fetchPlaceBySlug(town);
  const townLabel = place?.name || town;
  let textMonth = month;
  if (month === "marc") textMonth = month.replace("c", "ç");
  return buildPageMeta({
    title: `Arxiu de ${townLabel} del ${textMonth} del ${year} - Esdeveniments.cat`,
    description: `Descobreix què va passar a ${townLabel} el ${textMonth} del ${year}. Teatre, cinema, música, art i altres excuses per no parar de descobrir ${townLabel} - Arxiu - Esdeveniments.cat`,
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

  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

  const { from, until } = getHistoricDates(month, Number(year));

  const [events, place] = await Promise.all([
    fetchEvents({
      place: town,
      from: from.toISOString().split("T")[0],
      to: until.toISOString().split("T")[0],
      size: 2500,
    }),
    fetchPlaceBySlug(town),
  ]);
  const townLabel = place?.name || town;

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
    description: `Esdeveniments culturals que van tenir lloc a ${townLabel} durant el ${textMonth} del ${year}`,
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
        <Script
          id={`${town}-${month}-${year}-events`}
          type="application/ld+json"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonData) }}
        />
      )}

      {/* Enhanced Collection Page Schema */}
      <Script
        id={`${town}-${month}-${year}-collection`}
        type="application/ld+json"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionPageSchema),
        }}
      />

      {/* Enhanced Events ItemList Schema */}
      {eventsItemList && (
        <Script
          id={`${town}-${month}-${year}-itemlist`}
          type="application/ld+json"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(eventsItemList),
          }}
        />
      )}

      <div
        className="w-full flex flex-col justify-center items-center gap-2 pt-2 pb-14 sm:w-[580px] md:w-[768px] lg:w-[1024px] px-4 md:px-0"
        role="main"
      >
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="w-full mb-4">
          <ol className="flex items-center space-x-2 text-sm text-foreground/80">
            <li>
              <Link href="/" className="hover:text-foreground">
                Inici
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
              <Link href="/sitemap" className="hover:text-foreground">
                Arxiu
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
              <Link href={`/sitemap/${town}`} className="hover:text-foreground">
                {townLabel}
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
              <span className="text-foreground capitalize">
                {textMonth} {year}
              </span>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <header className="w-full text-center mb-6">
          <h1 className="font-semibold italic uppercase text-2xl mb-2">
            Arxiu {townLabel} - {textMonth} del {year}
          </h1>
          <p className="text-foreground/80 mb-4">
            {filteredEvents.length > 0
              ? `${filteredEvents.length} esdeveniments culturals documentats`
              : `No s'han trobat esdeveniments per aquest període`}
          </p>
        </header>

        {/* Events List */}
        <section className="w-full">
          {filteredEvents.length > 0 ? (
            <div className="flex flex-col items-start space-y-4">
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
                      <h3 className="text-lg font-medium group-hover:text-blue-600 transition-colors">
                        {event.title}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-foreground/80 mt-1">
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
                            <span className="text-blue-600">
                              {event.categories[0].name}
                            </span>
                          </>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-foreground mt-2 line-clamp-2">
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

        {/* Footer with navigation hints */}
        {filteredEvents.length > 0 && (
          <footer className="w-full mt-12 pt-8 border-t border-border">
            <div className="text-center">
              <p className="text-sm text-foreground/80 mb-4">
                Vols explorar més esdeveniments de {townLabel}?
              </p>
              <div className="flex justify-center space-x-4">
                <Link
                  href={`/sitemap/${town}`}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Veure tots els arxius
                </Link>
                <Link
                  href={`/${town}`}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Esdeveniments actuals
                </Link>
              </div>
            </div>
          </footer>
        )}
      </div>
    </>
  );
}
