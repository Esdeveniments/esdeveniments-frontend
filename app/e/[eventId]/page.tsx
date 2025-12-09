import { Suspense } from "react";
import { generateJsonData } from "@utils/helpers";
import { getEventBySlug } from "@lib/api/events";
import { EventDetailResponseDTO } from "types/api/event";
import { Metadata } from "next";
import { siteUrl } from "@config/index";
import { generateEventMetadata } from "../../../lib/meta";
import { redirect } from "next/navigation";
import { extractUuidFromSlug } from "@utils/string-helpers";
import EventMedia from "./components/EventMedia";
import EventShareBar from "./components/EventShareBar";
import ViewCounter from "@components/ui/viewCounter";
import EventHeader from "./components/EventHeader";
import EventCalendar from "./components/EventCalendar";
import { buildEventStatusLabels, computeTemporalStatus } from "@utils/event-status";
import type { EventTemporalStatus } from "types/event-status";
import type { EventCopyLabels } from "types/common";
import { getFormattedDate } from "@utils/helpers";
import PastEventBanner from "./components/PastEventBanner";
import EventDescription from "./components/EventDescription";
import EventCategories from "./components/EventCategories";
import NoEventFound from "components/ui/common/noEventFound";
import EventsAroundSection from "@components/ui/eventsAround/EventsAroundSection";
import {
  SpeakerphoneIcon,
  InformationCircleIcon as InfoIcon,
} from "@heroicons/react/outline";
import EventDetailsSection from "./components/EventDetailsSection";
import { RestaurantPromotionSection } from "@components/ui/restaurantPromotion";
import SectionHeading from "@components/ui/common/SectionHeading";
import {
  buildEventIntroText,
  buildFaqItems,
  buildFaqJsonLd,
  formatPlaceName,
} from "@utils/helpers";
import LatestNewsSection from "./components/LatestNewsSection";
import JsonLdServer from "@components/partials/JsonLdServer";
import ClientEventClient from "./components/ClientEventClient";
import AdArticleIsland from "./components/AdArticleIsland";
import EventLocation from "./components/EventLocation";
import EventWeather from "./components/EventWeather";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const slug = (await props.params).eventId;
  let event = await getEventBySlug(slug);
  if (!event) {
    // Defensive: try fetching by trailing id (legacy slugs)
    const id = extractUuidFromSlug(slug);
    if (id && id !== slug) {
      event = await getEventBySlug(id);
    }
  }
  if (!event) return { title: "No event found" };
  // Use canonical derived from the event itself to avoid locking old slugs
  // into metadata; this helps consolidate SEO to the canonical path.
  return generateEventMetadata(event);
}

// Main page component
export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const slug = (await params).eventId;

  // With relaxed CSP we no longer require a nonce here; compute mobile on client
  const initialIsMobile = false;

  let event: EventDetailResponseDTO | null = await getEventBySlug(slug);
  if (!event) {
    // Defensive: try fetching by trailing id (legacy slugs)
    const id = extractUuidFromSlug(slug);
    if (id && id !== slug) {
      event = await getEventBySlug(id);
    }
  }
  if (!event) return <NoEventFound />;
  if (event.title === "CANCELLED") return <NoEventFound />;

  // If the requested slug doesn't match the canonical one, optionally redirect
  // to consolidate SEO. Gate with env to avoid surprises in rollout.
  const enforceCanonicalRedirect =
    process.env.NEXT_PUBLIC_CANONICAL_REDIRECT === "1" ||
    process.env.CANONICAL_REDIRECT === "1";
  if (enforceCanonicalRedirect && slug !== event.slug && event.slug) {
    redirect(`/e/${event.slug}`);
  }

  const eventSlug = event?.slug ?? "";
  const title = event?.title ?? "";
  const rawCityName = event.city?.name || "";
  const rawRegionName = event.region?.name || "";
  const cityName = formatPlaceName(rawCityName);
  const regionName = formatPlaceName(rawRegionName);
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
  const tStatus = await getTranslations("Utils.EventStatus");
  const tEvent = await getTranslations("Components.EventPage");
  const tCopy = await getTranslations("Utils.EventCopy");
  const statusLabels = buildEventStatusLabels(tStatus);
  const eventCopyLabels: EventCopyLabels = {
    sentence: {
      verbSingular: tCopy("sentence.verbSingular"),
      verbPlural: tCopy("sentence.verbPlural"),
      dateRange: tCopy("sentence.dateRange", {
        start: "{start}",
        end: "{end}",
      }),
      dateSingle: tCopy("sentence.dateSingle", {
        nameDay: "{nameDay}",
        start: "{start}",
      }),
      sentence: tCopy("sentence.sentence", {
        title: "{title}",
        verb: "{verb}",
        date: "{date}",
        time: "{time}",
        place: "{place}",
      }),
      timeSuffix: tCopy("sentence.timeSuffix", { time: "{time}" }),
      placeSuffix: tCopy("sentence.placeSuffix", { place: "{place}" }),
    },
    faq: {
      whenQ: tCopy("faq.whenQ"),
      whenA: tCopy("faq.whenA", { date: "{date}", time: "{time}" }),
      whereQ: tCopy("faq.whereQ"),
      whereA: tCopy("faq.whereA", { place: "{place}" }),
      isFreeQ: tCopy("faq.isFreeQ"),
      isFreeYes: tCopy("faq.isFreeYes"),
      isFreeNo: tCopy("faq.isFreeNo"),
      durationQ: tCopy("faq.durationQ"),
      durationA: tCopy("faq.durationA", { duration: "{duration}" }),
    },
  };
  const temporalStatus: EventTemporalStatus = computeTemporalStatus(
    event.startDate,
    event.endDate,
    undefined,
    event.startTime,
    event.endTime,
    statusLabels
  );

  const { formattedStart, formattedEnd, nameDay } = await getFormattedDate(
    event.startDate,
    event.endDate
  );

  const statusMeta = {
    state: temporalStatus.state,
    label: temporalStatus.label,
  };

  // Build intro and FAQ via shared utils (no assumptions)
  const introText = await buildEventIntroText(event, eventCopyLabels);
  const faqItems = await buildFaqItems(event, eventCopyLabels);
  const faqJsonLd = buildFaqJsonLd(faqItems);

  // Prepare place data for LatestNewsSection (streamed separately)
  const placeSlug = event.city?.slug || event.region?.slug || "catalunya";
  const placeLabel = cityName || regionName || "Catalunya";
  const placeType: "region" | "town" = event.city ? "town" : "region";
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

  // Generate BreadcrumbList JSON-LD
  // Ensure breadcrumb name is never empty (required by Google structured data)
  const breadcrumbName = (() => {
    if (title) return title;
    if (placeLabel) return `Esdeveniment a ${placeLabel}`;
    return "Esdeveniment";
  })();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inici",
        item: siteUrl,
      },
      ...(placeSlug
        ? [
          {
            "@type": "ListItem",
            position: 2,
            name: placeLabel,
            item: `${siteUrl}/${placeSlug}`,
          },
        ]
        : []),
      {
        "@type": "ListItem",
        position: placeSlug ? 3 : 2,
        name: breadcrumbName,
        item: `${siteUrl}/e/${event.slug}`,
      },
    ],
  };

  return (
    <>
      {/* Main Event JSON-LD */}
      <JsonLdServer
        id={event.id ? String(event.id) : undefined}
        data={jsonData}
      />
      {/* Related Events JSON-LD */}
      {relatedEventsJsonData && (
        <JsonLdServer
          id={`related-events-${event.id}`}
          data={relatedEventsJsonData}
        />
      )}
      {/* Breadcrumbs JSON-LD */}
      <JsonLdServer id={`breadcrumbs-${event.id}`} data={breadcrumbJsonLd} />
      <div className="w-full bg-background pb-10">
        <div className="container flex flex-col gap-section-y min-w-0">
          <article className="w-full flex flex-col gap-section-y">
            {/* Event Media Hero + Share cluster */}
            <div className="w-full flex flex-col">
              <div className="w-full">
                <EventMedia event={event} title={title} />
              </div>
              {/* Share bar and view counter */}
              <div className="w-full flex justify-between items-center mt-element-gap-sm">
                <EventShareBar
                  slug={eventSlug}
                  title={title}
                  description={event.description}
                  eventDateString={eventDateString}
                  location={event.location}
                  initialIsMobile={initialIsMobile}
                  cityName={cityName}
                  regionName={regionName}
                  postalCode={event.city?.postalCode || ""}
                />
                <div className="ml-element-gap-sm">
                  <ViewCounter visits={event.visits} />
                </div>
              </div>
            </div>{" "}
            {/* Event Header with status pill - Server-side rendered */}
            <EventHeader title={title} statusMeta={statusMeta} />
            {/* Event Calendar - Server-side rendered */}
            <EventCalendar event={event} />
            {/* Event Description - bring core info immediately */}
            <EventDescription
              description={event.description}
              locationValue={event.city?.slug || event.region?.slug || ""}
              location={cityName || regionName}
              introText={introText}
              locationType="town"
            />
            {/* Location (SSR for SEO) with client map toggle */}
            <EventLocation
              location={event.location}
              cityName={cityName}
              regionName={regionName}
              citySlug={event.city?.slug}
              regionSlug={event.region?.slug}
            />
            {/* Related Events - Server-side rendered for SEO */}
            {event.relatedEvents && event.relatedEvents.length > 0 && (
              <EventsAroundSection
                events={event.relatedEvents}
                title="Esdeveniments relacionats"
              />
            )}
            {/* Event Categories - Server-side rendered for SEO */}
            <EventCategories categories={event.categories} place={placeSlug} />
            {/* Event details (status, duration, external url) - server-rendered */}
            <EventDetailsSection
              event={event}
              temporalStatus={temporalStatus}
              formattedStart={formattedStart}
              formattedEnd={formattedEnd}
              nameDay={nameDay}
            />
            {/* Weather (SSR; hidden for past events) */}
            {temporalStatus.state !== "past" && (
              <EventWeather weather={event.weather} />
            )}
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
            <ClientEventClient event={event} />
            {/* Dynamic FAQ Section (SSR, gated by data) */}
            {faqItems.length >= 2 && (
              <section className="w-full" aria-labelledby="event-faq">
                <div className="w-full flex flex-col gap-element-gap">
                  <SectionHeading
                    headingId="event-faq"
                    Icon={InfoIcon}
                    iconClassName="w-5 h-5 text-foreground-strong flex-shrink-0"
                    title={tEvent("faqTitle")}
                    titleClassName="heading-2"
                  />
                  <dl className="space-y-element-gap px-section-x">
                    {faqItems.map((item) => (
                      <div key={item.q}>
                        <dt className="body-normal font-semibold text-foreground-strong">
                          {item.q}
                        </dt>
                        <dd className="body-normal text-foreground-strong/70">
                          {item.a}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </section>
            )}
            {/* Restaurant Promotion Section */}
            <RestaurantPromotionSection
              eventId={event.id}
              eventLocation={event.location}
              eventLat={event.city?.latitude}
              eventLng={event.city?.longitude}
              eventStartDate={event.startDate}
              eventEndDate={event.endDate}
              eventStartTime={event.startTime}
              eventEndTime={event.endTime}
            />
            {/* Final Ad Section */}
            <div className="w-full h-full min-h-[250px]">
              <div className="w-full flex flex-col gap-element-gap">
                <SectionHeading
                  Icon={SpeakerphoneIcon}
                  iconClassName="w-5 h-5 text-foreground-strong flex-shrink-0"
                  title={tEvent("sponsored")}
                  titleClassName="heading-2"
                />
                <div className="px-section-x">
                  <AdArticleIsland slot="9643657007" />
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* Latest News Section - Streamed separately to improve TTFB */}
      <Suspense fallback={null}>
        <LatestNewsSection
          placeSlug={placeSlug}
          placeLabel={placeLabel}
          placeType={placeType}
          newsHref={newsHref}
        />
      </Suspense>

      {/* FAQ JSON-LD (only when we have 2+ items) */}
      {faqJsonLd && <JsonLdServer id={`faq-${event.id}`} data={faqJsonLd} />}
    </>
  );
}

export const revalidate = 1800;
