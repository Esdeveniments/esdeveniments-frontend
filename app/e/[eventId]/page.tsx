import { generateJsonData } from "@utils/helpers";
import { fetchEventBySlug } from "@lib/api/events";
import { EventDetailResponseDTO } from "types/api/event";
import { Metadata } from "next";
import { siteUrl } from "@config/index";
import { generateEventMetadata } from "../../../lib/meta";
import { headers } from "next/headers";
import Script from "next/script";
import EventMedia from "./components/EventMedia";
import EventShareBar from "./components/EventShareBar";
import EventClient from "./EventClient";
import NoEventFound from "components/ui/common/noEventFound";
import EventsAroundSection from "@components/ui/eventsAround/EventsAroundSection";
import { SpeakerphoneIcon } from "@heroicons/react/outline";
import AdArticle from "components/ui/adArticle";
import { fetchNews } from "@lib/api/news";
import NewsCard from "@components/ui/newsCard";
import Link from "next/link";

// Helper: Metadata generation
export async function generateMetadata(props: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const slug = (await props.params).eventId;
  if (process.env.E2E_TEST_MODE === "true" && slug === "e2e-test-event") {
    return { title: "E2E Test Event" };
  }
  const event = await fetchEventBySlug(slug);
  if (!event) return { title: "No event found" };
  return generateEventMetadata(event, `${siteUrl}/e/${slug}`);
}

// Main page component
export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const slug = (await params).eventId;

  // Read the nonce from the middleware headers
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

  if (process.env.E2E_TEST_MODE === "true" && slug === "e2e-test-event") {
    const fake: EventDetailResponseDTO = {
      id: 1,
      slug: "e2e-test-event",
      title: "E2E Test Event",
      description: "Detall de prova per E2E",
      startDate: "2025-01-01",
      endDate: null as any,
      location: "Barcelona",
      city: { id: 1, name: "Barcelona", slug: "barcelona", postalCode: "08001" } as any,
      region: { id: 1, name: "Barcelona", slug: "barcelona" } as any,
      categories: [],
      imageUrl: "",
      visits: 0,
      duration: null as any,
      weather: undefined,
      tags: [],
      type: "FREE",
      url: "https://example.com",
    } as any

    const jsonData = generateJsonData(fake)

    return (
      <>
        <Script
          id="e2e-jsonld"
          type="application/ld+json"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonData) }}
        />
        <div className="w-full flex justify-center bg-whiteCorp pb-10">
          <div className="w-full flex flex-col justify-center items-center gap-4 sm:w-[520px] md:w-[520px] lg:w-[520px] min-w-0">
            <article className="w-full flex flex-col justify-center items-start gap-8">
              <div className="w-full flex flex-col justify-center items-start gap-4">
                <EventShareBar
                  visits={0}
                  slug={fake.slug}
                  title={fake.title}
                  description={fake.description}
                  eventDateString={fake.startDate}
                  location={fake.location}
                  cityName={fake.city.name}
                  regionName={fake.region.name}
                  postalCode={fake.city.postalCode}
                />
              </div>
              <EventClient event={fake} />
            </article>
          </div>
        </div>
      </>
    )
  }

  const event: EventDetailResponseDTO | null = await fetchEventBySlug(slug);
  if (!event) return <NoEventFound />;
  if (event.title === "CANCELLED") return <NoEventFound />;

  const eventSlug = event?.slug ?? "";
  const title = event?.title ?? "";
  const cityName = event.city?.name || "";
  const regionName = event.region?.name || "";
  const eventDateString = event.endDate
    ? `Del ${event.startDate} al ${event.endDate}`
    : `${event.startDate}`;
  const jsonData = generateJsonData({ ...event });

  // Fetch latest news for the event's place (prefer city, then region, fallback Catalunya)
  const placeSlug = event.city?.slug || event.region?.slug || "catalunya";
  const newsResponse = await fetchNews({ page: 0, size: 3, place: placeSlug });
  const latestNews = newsResponse.content || [];
  const placeLabel = event.city?.name || event.region?.name || "Catalunya";
  const newsHref =
    placeSlug === "catalunya" ? "/noticies" : `/noticies/${placeSlug}`;

  // Generate JSON-LD for related events (server-side for SEO)
  const relatedEventsJsonData =
    event.relatedEvents && event.relatedEvents.length > 0
      ? {
          "@id": `${siteUrl}#itemlist-${title
            ?.toLowerCase()
            .replace(/\s+/g, "-")}`,
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Related Events",
          numberOfItems: event.relatedEvents.length,
          itemListElement: event.relatedEvents
            .slice(0, 10) // Limit for performance
            .map((relatedEvent, index) => {
              try {
                return {
                  "@type": "ListItem",
                  position: index + 1,
                  item: generateJsonData(relatedEvent),
                };
              } catch (err) {
                console.error(
                  "Error generating JSON-LD for related event:",
                  relatedEvent.id,
                  err
                );
                return null;
              }
            })
            .filter(Boolean),
        }
      : null;

  return (
    <>
      {/* Main Event JSON-LD */}
      <Script
        id={event.id ? String(event.id) : undefined}
        type="application/ld+json"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonData) }}
      />
      {/* Related Events JSON-LD */}
      {relatedEventsJsonData && (
        <Script
          id={`related-events-${event.id}`}
          type="application/ld+json"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(relatedEventsJsonData),
          }}
        />
      )}
      <div className="w-full flex justify-center bg-whiteCorp pb-10">
        <div className="w-full flex flex-col justify-center items-center gap-4 sm:w-[520px] md:w-[520px] lg:w-[520px] min-w-0">
          <article className="w-full flex flex-col justifycenter items-start gap-8">
            <div className="w-full flex flex-col justify-center items-start gap-4">
              <EventMedia event={event} title={title} />
              <EventShareBar
                visits={event.visits}
                slug={eventSlug}
                title={title}
                description={event.description}
                eventDateString={eventDateString}
                location={event.location}
                cityName={cityName}
                regionName={regionName}
                postalCode={event.city?.postalCode || ""}
              />
            </div>
            <EventClient event={event} />
            {/* Related Events - Server-side rendered for SEO */}
            {event.relatedEvents && event.relatedEvents.length > 0 && (
              <EventsAroundSection
                events={event.relatedEvents}
                title="Esdeveniments relacionats"
                nonce={nonce}
              />
            )}
            {/* Final Ad Section */}
            <div className="w-full h-full flex justify-center items-start px-4 min-h-[250px] gap-2">
              <SpeakerphoneIcon className="w-5 h-5 mt-1" />
              <div className="w-11/12 flex flex-col gap-4">
                <h2>Contingut patrocinat</h2>
                <AdArticle slot="9643657007" />
              </div>
            </div>
          </article>
        </div>
      </div>

      {latestNews.length > 0 && (
        <div className="w-full flex justify-center bg-whiteCorp pb-8">
          <section className="w-full sm:w-[520px] md:w-[520px] lg:w-[520px] px-4 flex flex-col gap-4">
            <div className="w-full flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Últimes notícies {placeLabel ? `a ${placeLabel}` : ""}
              </h2>
              <Link
                href={newsHref}
                prefetch={false}
                className="text-primary underline text-sm"
              >
                Veure totes
              </Link>
            </div>
            <div className="flex flex-col gap-4">
              {latestNews.map((newsItem, index) => (
                <NewsCard
                  key={`${newsItem.id}-${index}`}
                  event={newsItem}
                  placeSlug={placeSlug}
                  placeLabel={placeLabel}
                  variant={index === 0 ? "hero" : "default"}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export const revalidate = 1800;
