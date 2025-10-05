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
import { Text } from "@components/ui/primitives";

const NoEventsFound = dynamic(
  () => import("components/ui/domain/noEventsFound"),
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
        (event) => !event.isAd,
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
          `Col·lecció d'esdeveniments culturals de ${townLabel} del ${textMonth} del ${year}`,
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
        className="pb-3xl md:px-xs flex w-full flex-col items-center justify-center gap-component-xs px-component-md pt-component-xs sm:w-[580px] md:w-[768px] lg:w-[1024px]"
        role="main"
      >
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-component-md w-full">
          <ol className="flex items-center space-x-2 text-blackCorp/80">
            <li>
              <Link href="/" className="hover:text-blackCorp">
                Inici
              </Link>
            </li>
            <li>
              <span className="mx-component-xs">/</span>
              <Link href="/sitemap" className="hover:text-blackCorp">
                Arxiu
              </Link>
            </li>
            <li>
              <span className="mx-component-xs">/</span>
              <Link href={`/sitemap/${town}`} className="hover:text-blackCorp">
                {townLabel}
              </Link>
            </li>
            <li>
              <span className="mx-component-xs">/</span>
              <Text variant="body-sm" className="capitalize text-blackCorp">
                {textMonth} {year}
              </Text>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-component-lg w-full text-center">
          <Text
            as="h1"
            variant="h1"
            className="mb-component-xs uppercase italic"
          >
            Arxiu {townLabel} - {textMonth} del {year}
          </Text>
          <Text
            as="p"
            variant="body"
            className="mb-component-md text-blackCorp/80"
          >
            {filteredEvents.length > 0
              ? `${filteredEvents.length} esdeveniments culturals documentats`
              : `No s'han trobat esdeveniments per aquest període`}
          </Text>
        </header>

        {/* Events List */}
        <section className="w-full">
          {filteredEvents.length > 0 ? (
            <div className="flex flex-col items-start space-y-4">
              <Text as="h2" variant="h2" className="sr-only">
                Llista d&apos;esdeveniments
              </Text>
              {filteredEvents.map((event: EventSummaryResponseDTO) => {
                const { formattedStart, formattedEnd } = getFormattedDate(
                  event.startDate,
                  event.endDate,
                );
                return (
                  <article
                    key={event.id}
                    className="w-full border-b border-bColor/50 pb-component-md"
                  >
                    <Link
                      href={`/e/${event.slug}`}
                      prefetch={false}
                      className="group block hover:text-primary"
                    >
                      <Text
                        as="h3"
                        variant="h3"
                        className="group-hover:text-blue-600 transition-colors"
                      >
                        {event.title}
                      </Text>
                      <div className="mt-component-xs flex flex-col text-blackCorp/80 sm:flex-row sm:items-center sm:space-x-4">
                        <time dateTime={event.startDate}>
                          <Text variant="body-sm">
                            {formattedEnd
                              ? `${formattedStart} - ${formattedEnd}`
                              : `${formattedStart}`}
                          </Text>
                        </time>
                        {event.location && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <Text variant="body-sm">{event.location}</Text>
                          </>
                        )}
                        {event.categories && event.categories.length > 0 && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <Text variant="body-sm" className="text-blue-600">
                              {event.categories[0].name}
                            </Text>
                          </>
                        )}
                      </div>
                      {event.description && (
                        <Text
                          as="p"
                          variant="body-sm"
                          className="mt-component-xs line-clamp-2 text-blackCorp"
                        >
                          {event.description}
                        </Text>
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
          <footer className="mt-component-2xl w-full border-t border-bColor/50 pt-component-xl">
            <div className="text-center">
              <Text
                as="p"
                variant="body-sm"
                className="mb-component-md text-blackCorp/80"
              >
                Vols explorar més esdeveniments de {townLabel}?
              </Text>
              <div className="flex justify-center space-x-4">
                <Link
                  href={`/sitemap/${town}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Text variant="body-sm">Veure tots els arxius</Text>
                </Link>
                <Link
                  href={`/${town}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Text variant="body-sm">Esdeveniments actuals</Text>
                </Link>
              </div>
            </div>
          </footer>
        )}
      </div>
    </>
  );
}
