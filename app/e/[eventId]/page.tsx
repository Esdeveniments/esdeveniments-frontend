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
import { ViewCounter, Text } from "@components/ui/primitives";
import EventHeader from "./components/EventHeader";
import EventCalendar from "./components/EventCalendar";
import { computeTemporalStatus } from "@utils/event-status";
import type { EventTemporalStatus } from "types/event-status";
import EventClient from "./EventClient";
import { getFormattedDate } from "@utils/helpers";
import PastEventBanner from "./components/PastEventBanner";
import EventDescription from "./components/EventDescription";
import EventCategories from "./components/EventCategories";
import NoEventFound from "components/ui/domain/noEventFound";
import EventsAroundSection from "@components/ui/domain/eventsAround/EventsAroundSection";
import {
  SpeakerphoneIcon,
  InformationCircleIcon as InfoIcon,
} from "@heroicons/react/outline";
import { AdArticle } from "@components/ui/primitives";
import { fetchNews } from "@lib/api/news";
import { Card } from "@components/ui/primitives";
import Link from "next/link";
import EventDetailsSection from "./components/EventDetailsSection";
import { RestaurantPromotionSection } from "@components/ui/domain/restaurantPromotion";
import {
  buildEventIntroText,
  buildFaqItems,
  buildFaqJsonLd,
} from "@utils/helpers";

export async function generateMetadata(props: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const slug = (await props.params).eventId;
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

  const event: EventDetailResponseDTO | null = await fetchEventBySlug(slug);
  if (!event) return <NoEventFound />;
  if (event.title === "CANCELLED") return <NoEventFound />;

  const eventSlug = event?.slug ?? "";
  const title = event?.title ?? "";
  const cityName = event.city?.name || "";
  const regionName = event.region?.name || "";
  const citySlug = event.city?.slug;
  const regionSlug = event.region?.slug;
  const primaryPlaceSlug = citySlug || regionSlug || "catalunya";
  const primaryCategorySlug = event.categories?.[0]?.slug;
  const explorePlaceHref = `/${primaryPlaceSlug}`;
  const exploreCategoryHref = primaryCategorySlug
    ? `/${primaryPlaceSlug}/${primaryCategorySlug}`
    : explorePlaceHref;
  const eventDateString = event.endDate
    ? `Del ${event.startDate} al ${event.endDate}`
    : `${event.startDate}`;
  const jsonData = generateJsonData({ ...event });
  const temporalStatus: EventTemporalStatus = computeTemporalStatus(
    event.startDate,
    event.endDate,
  );

  const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
    event.startDate,
    event.endDate,
  );

  const statusMeta = {
    state: temporalStatus.state,
    label: temporalStatus.label,
  };

  // Build intro and FAQ via shared utils (no assumptions)
  const introText = buildEventIntroText(event);
  const faqItems = buildFaqItems(event);
  const faqJsonLd = buildFaqJsonLd(faqItems);

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
                  err,
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
      <div className="pb-2xl flex w-full justify-center bg-whiteCorp">
        <div className="flex w-full min-w-0 flex-col items-center justify-center gap-component-md sm:w-[520px] md:w-[520px] lg:w-[520px]">
          <article className="flex w-full flex-col items-start justify-center gap-component-xl">
            <div className="flex w-full flex-col items-start justify-center gap-component-md">
              <EventMedia event={event} title={title} />
              <div className="flex w-full items-center justify-between px-component-md">
                <EventShareBar
                  slug={eventSlug}
                  title={title}
                  description={event.description}
                  eventDateString={eventDateString}
                  location={event.location}
                  cityName={cityName}
                  regionName={regionName}
                  postalCode={event.city?.postalCode || ""}
                />
                <div className="ml-component-xs">
                  <ViewCounter visits={event.visits} />
                </div>
              </div>
            </div>

            {/* Event Header with status pill - Server-side rendered */}
            <EventHeader title={title} statusMeta={statusMeta} />

            {/* Event Calendar - Server-side rendered */}
            <EventCalendar event={event} />

            {/* Related Events - Server-side rendered for SEO */}
            {event.relatedEvents && event.relatedEvents.length > 0 && (
              <EventsAroundSection
                events={event.relatedEvents}
                title="Esdeveniments relacionats"
                nonce={nonce}
              />
            )}

            {/* Event Description - Server-side rendered for SEO */}
            <EventDescription
              description={event.description}
              locationValue={event.city?.slug || event.region?.slug || ""}
              location={cityName || regionName}
              introText={introText}
              locationType="town"
            />

            {/* Event Categories - Server-side rendered for SEO */}
            <EventCategories
              categories={event.categories}
              place={event.region?.slug || ""}
            />

            {/* Past Event Banner (high visibility) - server component */}
            {temporalStatus.state === "past" && (
              <PastEventBanner
                temporalStatus={temporalStatus}
                cityName={cityName}
                regionName={regionName}
                explorePlaceHref={explorePlaceHref}
                exploreCategoryHref={exploreCategoryHref}
                primaryCategorySlug={primaryCategorySlug}
              />
            )}

            <EventClient event={event} temporalStatus={temporalStatus} />

            {/* Event details (status, duration, external url) - server-rendered */}
            <EventDetailsSection
              event={event}
              temporalStatus={temporalStatus}
              formattedStart={formattedStart}
              formattedEnd={formattedEnd}
              nameDay={nameDay}
            />

            {/* Dynamic FAQ Section (SSR, gated by data) */}
            {faqItems.length >= 2 && (
              <div className="flex w-full items-start justify-center gap-component-xs px-component-md">
                <InfoIcon className="mt-component-xs h-5 w-5" />
                <section
                  className="flex w-11/12 flex-col gap-component-md"
                  aria-labelledby="event-faq"
                >
                  <Text as="h2" id="event-faq" variant="h2">
                    Preguntes freqüents
                  </Text>
                  <dl className="space-y-3">
                    {faqItems.map((item) => (
                      <div key={item.q}>
                        <dt className="font-medium">{item.q}</dt>
                        <dd className="text-blackCorp/70">{item.a}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
            )}

            {/* Restaurant Promotion Section */}
            <RestaurantPromotionSection
              eventId={event.id}
              eventLocation={event.location}
              eventLat={event.city?.latitude}
              eventLng={event.city?.longitude}
              eventStartDate={event.startDate}
              eventEndDate={event.endDate}
            />

            {/* Final Ad Section */}
            <div className="flex h-full min-h-[250px] w-full items-start justify-center gap-component-xs px-component-md">
              <SpeakerphoneIcon className="mt-component-xs h-5 w-5" />
              <div className="flex w-11/12 flex-col gap-component-md">
                <Text as="h2" variant="h2">
                  Contingut patrocinat
                </Text>
                <AdArticle slot="9643657007" />
              </div>
            </div>
          </article>
        </div>
      </div>

      {latestNews.length > 0 && (
        <div className="flex w-full justify-center bg-whiteCorp pb-component-xl">
          <section className="flex w-full flex-col gap-component-md px-component-md sm:w-[520px] md:w-[520px] lg:w-[520px]">
            <div className="flex w-full items-center justify-between">
              <Text as="h2" variant="body-lg" className="font-semibold">
                Últimes notícies {placeLabel ? `a ${placeLabel}` : ""}
              </Text>
              <Link href={newsHref} prefetch={false} className="underline">
                <Text variant="body-sm" color="primary">
                  Veure totes
                </Text>
              </Link>
            </div>
            <div className="flex flex-col gap-component-md">
              {latestNews.map((newsItem, index) => (
                <Card
                  key={`${newsItem.id}-${index}`}
                  type="news"
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

      {/* FAQ JSON-LD (only when we have 2+ items) */}
      {faqJsonLd && (
        <Script
          id={`faq-${event.id}`}
          type="application/ld+json"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
    </>
  );
}

export const revalidate = 1800;
