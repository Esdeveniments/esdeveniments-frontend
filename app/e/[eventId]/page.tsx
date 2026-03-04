import { Suspense } from "react";
import { generateJsonData } from "@utils/helpers";
import { getEventBySlug } from "@lib/api/events";
import { EventDetailResponseDTO } from "types/api/event";
import { Metadata } from "next";
import { siteUrl } from "@config/index";
import { generateEventMetadata } from "../../../lib/meta";
import { redirect, notFound } from "next/navigation";
import EventMedia from "./components/EventMedia";
import EventShareBar from "./components/EventShareBar";
import EventHeader from "./components/EventHeader";
import EventCalendar from "./components/EventCalendar";
import { buildEventStatusLabels, computeTemporalStatus } from "@utils/event-status";
import type { EventTemporalStatus } from "types/event-status";
import type { EventCopyLabels } from "types/common";
import PastEventBanner from "./components/PastEventBanner";
import Breadcrumbs from "@components/ui/common/Breadcrumbs";
import type { BreadcrumbNavItem } from "types/props";
import EventDescription from "./components/EventDescription";
import EventCategories from "./components/EventCategories";
import EventsAroundSection from "@components/ui/eventsAround/EventsAroundSection";
import {
  buildEventIntroText,
  formatPlaceName,
} from "@utils/helpers";
import { generateHowToSchema } from "@utils/schema-helpers";
import LatestNewsSection from "./components/LatestNewsSection";
import JsonLdServer from "@components/partials/JsonLdServer";
import { generateBreadcrumbList } from "@components/partials/seo-meta";
import ClientEventClient from "./components/ClientEventClient";
import EventLocation from "./components/EventLocation";
import EventWeather from "./components/EventWeather";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, withLocalePath, toLocalizedUrl } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";
import { getLocalizedCategoryLabelFromConfig } from "@utils/category-helpers";
import FavoriteButton from "@components/ui/common/favoriteButton";
import SponsorBannerSlot from "@components/ui/sponsor/SponsorBannerSlot";
import EventStickyCTA from "./components/EventStickyCTA";
import EventSidebar from "./components/EventSidebar";
import SocialProofCounter from "./components/SocialProofCounter";
import CollapsibleDescription from "./components/CollapsibleDescription";
import CulturalMessage from "@components/ui/common/culturalMessage";

// Lazy load below-the-fold client components via client component wrappers
// This allows us to use ssr: false in Next.js 16 (required for client components)
import LazyRestaurantPromotion from "./components/LazyRestaurantPromotion";

export async function generateMetadata(props: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const slug = (await props.params).eventId;
  const locale = await getLocaleSafely();
  const event = await getEventBySlug(slug);
  if (!event) return { title: "No event found" };
  // Use canonical derived from the event itself to avoid locking old slugs
  // into metadata; this helps consolidate SEO to the canonical path.
  const canonical = `${siteUrl}${withLocalePath(`/e/${event.slug}`, locale)}`;
  return generateEventMetadata(event, canonical, undefined, locale);
}

// Main page component
export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const slug = (await params).eventId;

  const locale = await getLocaleSafely();

  // With relaxed CSP we no longer require a nonce here; compute mobile on client
  const initialIsMobile = false;

  const event: EventDetailResponseDTO | null = await getEventBySlug(slug);
  if (!event) notFound();
  if (event.title === "CANCELLED") notFound();

  // If the requested slug doesn't match the canonical one, redirect
  // to consolidate SEO. This prevents duplicate content issues and ensures
  // all traffic goes to the canonical URL for better rankings.
  // Default to enabled unless explicitly disabled via environment variable.
  const disableCanonicalRedirect =
    process.env.NEXT_PUBLIC_CANONICAL_REDIRECT === "0" ||
    process.env.CANONICAL_REDIRECT === "0";
  if (!disableCanonicalRedirect && slug !== event.slug && event.slug) {
    redirect(withLocalePath(`/e/${event.slug}`, locale));
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
  const jsonData = generateJsonData({ ...event }, locale);

  // Parallelize all translation fetches to eliminate waterfall (8 calls → 1 round trip)
  const [
    tStatus,
    tEvent,
    tCard,
    tCopy,
    tCategories,
    tEventsAround,
    tHowTo,
    tBreadcrumbs,
  ] = await Promise.all([
    getTranslations({ locale, namespace: "Utils.EventStatus" }),
    getTranslations({ locale, namespace: "Components.EventPage" }),
    getTranslations({ locale, namespace: "Components.CardContent" }),
    getTranslations({ locale, namespace: "Utils.EventCopy" }),
    getTranslations({ locale, namespace: "Config.Categories" }),
    getTranslations({ locale, namespace: "Components.EventsAround" }),
    getTranslations({ locale, namespace: "Components.HowTo" }),
    getTranslations({ locale, namespace: "Components.Breadcrumbs" }),
  ]);
  const primaryCategoryLabel = primaryCategorySlug
    ? getLocalizedCategoryLabelFromConfig(
      primaryCategorySlug,
      event.categories?.[0]?.name || primaryCategorySlug,
      tCategories
    )
    : "";
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
      timeSuffixRange: tCopy("sentence.timeSuffixRange", {
        start: "{start}",
        end: "{end}",
      }),
      placeSuffix: tCopy("sentence.placeSuffix", { place: "{place}" }),
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

  const shouldShowFavoriteButton = Boolean(event.slug);
  const favoriteLabels = {
    add: tCard("favoriteAddAria"),
    remove: tCard("favoriteRemoveAria"),
  };

  // Build intro text via shared utils (no assumptions)
  const introText = await buildEventIntroText(event, eventCopyLabels, locale);

  // Prepare place data for LatestNewsSection (streamed separately)
  const placeLabel = cityName || regionName || "Catalunya";
  const placeType: "region" | "town" = event.city ? "town" : "region";
  const newsHref = withLocalePath(
    primaryPlaceSlug === "catalunya" ? "/noticies" : `/noticies/${primaryPlaceSlug}`,
    locale
  );

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
                item: generateJsonData(relatedEvent, locale),
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

  const howToSteps = [
    tHowTo("step1"),
    tHowTo("step2"),
    tHowTo("step3"),
  ];
  const howToJsonData = generateHowToSchema(
    tHowTo("name", { title: title || "Esdeveniment" }),
    howToSteps
  );

  // Generate BreadcrumbList JSON-LD
  // Ensure breadcrumb name is never empty (required by Google structured data)
  const breadcrumbName = (() => {
    if (title) return title;
    if (placeLabel) return `Esdeveniment a ${placeLabel}`;
    return "Esdeveniment";
  })();

  // Build breadcrumb items with region for cities (SEO: geographic hierarchy)
  // Structure: Inici > Region > City > Event  OR  Inici > Region > Event (if no city)
  const hasCity = Boolean(citySlug);
  const hasRegion = Boolean(regionSlug);

  // Build breadcrumb items array with localized URLs
  const homeLabel = tBreadcrumbs("home");
  const breadcrumbItems = [
    { name: homeLabel, url: toLocalizedUrl("/", locale) },
    // Add region (comarca) if available
    ...(hasRegion ? [{ name: regionName, url: toLocalizedUrl(`/${regionSlug}`, locale) }] : []),
    // Add city if different from region
    ...(hasCity ? [{ name: cityName, url: toLocalizedUrl(`/${citySlug}`, locale) }] : []),
    // Add event
    { name: breadcrumbName, url: toLocalizedUrl(`/e/${event.slug}`, locale) },
  ];
  const breadcrumbJsonLd = generateBreadcrumbList(breadcrumbItems);

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
      {/* HowTo JSON-LD for SEO strategy 5 */}
      {howToJsonData && (
        <JsonLdServer id={`howto-${event.id}`} data={howToJsonData} />
      )}
      {/* Breadcrumbs JSON-LD */}
      {breadcrumbJsonLd && (
        <JsonLdServer id={`breadcrumbs-${event.id}`} data={breadcrumbJsonLd} />
      )}
      <div className="w-full bg-background pb-10">
        <div className="container flex flex-col gap-section-y min-w-0">
          <article className="w-full flex flex-col gap-section-y">
            {/* Visible Breadcrumbs for internal linking — full width */}
            <Breadcrumbs
              items={[
                { label: tBreadcrumbs("home"), href: "/" },
                ...(hasRegion
                  ? [{ label: regionName, href: `/${regionSlug}` }]
                  : []),
                ...(hasCity
                  ? [{ label: cityName, href: `/${citySlug}` }]
                  : []),
                ...(primaryCategorySlug
                  ? [{
                    label: primaryCategoryLabel,
                    href: `/${primaryPlaceSlug}/${primaryCategorySlug}`,
                  }]
                  : []),
                { label: title },
              ] as BreadcrumbNavItem[]}
              className="px-section-x pt-4"
            />

            {/* Two-column layout: Main content + Sticky sidebar (desktop) */}
            <div className="flex flex-col lg:flex-row lg:gap-8">
              {/* ========== MAIN CONTENT (left column) ========== */}
              <div className="flex-1 min-w-0 flex flex-col gap-section-y-sm">
                {/* Event Media Hero */}
                <div className="w-full flex flex-col">
                  <div className="w-full">
                    <EventMedia event={event} title={title} />
                  </div>
                  {/* Share bar + favorite + social proof */}
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
                    <div className="ml-element-gap-sm flex items-center gap-2">
                      {shouldShowFavoriteButton && (
                        <FavoriteButton
                          eventSlug={event.slug}
                          eventId={event.id ? String(event.id) : undefined}
                          eventTitle={event.title}
                          initialIsFavorite={false}
                          labels={favoriteLabels}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Event Header with status pill + social proof */}
                <div className="flex flex-col gap-1">
                  <EventHeader title={title} temporalStatus={temporalStatus} />
                  <SocialProofCounter
                    visits={event.visits}
                    interestedLabel={tEvent("interested", { count: event.visits })}
                  />
                </div>

                {/* Calendar — mobile only (between title and description) */}
                <div className="lg:hidden" data-calendar-section>
                  <EventCalendar event={event} compact />
                </div>

                {/* Description with collapsible on mobile */}
                <CollapsibleDescription>
                  <EventDescription
                    description={event.description}
                    introText={introText}
                    locale={locale as AppLocale}
                    showTranslate={temporalStatus.state !== "past"}
                  />
                </CollapsibleDescription>

                {/* Location — mobile only */}
                <div className="lg:hidden">
                  <EventLocation
                    location={event.location}
                    cityName={cityName}
                    regionName={regionName}
                    citySlug={event.city?.slug}
                    regionSlug={event.region?.slug}
                  />
                </div>

                {/* Weather — mobile only (desktop shows in sidebar) */}
                {temporalStatus.state !== "past" && (
                  <div className="lg:hidden">
                    <EventWeather weather={event.weather} />
                  </div>
                )}

                {/* Past Event Banner — early visibility for past events */}
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

                {/* Sponsor — mobile only */}
                <div className="lg:hidden">
                  <SponsorBannerSlot
                    place={primaryPlaceSlug}
                    fallbackPlaces={[
                      ...(citySlug && regionSlug ? [regionSlug] : []),
                      "catalunya",
                    ].filter((p) => p !== primaryPlaceSlug)}
                  />
                </div>

                {/* Related Events */}
                {event.relatedEvents && event.relatedEvents.length > 0 && (
                  <div
                    data-analytics-container="true"
                    data-analytics-context="related_events"
                    data-analytics-source-event-id={event.id ? String(event.id) : ""}
                    data-analytics-source-event-slug={event.slug || ""}
                  >
                    <EventsAroundSection
                      events={event.relatedEvents}
                      title={tEventsAround("relatedEvents")}
                    />
                  </div>
                )}

                {/* Explore more plans — after related events, before categories */}
                <CulturalMessage
                  location={cityName || regionName}
                  locationValue={event.city?.slug || event.region?.slug || ""}
                  locationType={placeType}
                />

                {/* Event Categories */}
                <EventCategories categories={event.categories} place={primaryPlaceSlug} />

                {/* Restaurant Promotion */}
                <Suspense fallback={null}>
                  <LazyRestaurantPromotion
                    eventId={event.id}
                    eventLocation={event.location}
                    eventLat={event.city?.latitude}
                    eventLng={event.city?.longitude}
                    eventStartDate={event.startDate}
                    eventEndDate={event.endDate}
                    eventStartTime={event.startTime}
                    eventEndTime={event.endTime}
                  />
                </Suspense>

                {/* Client-side ad + notifications */}
                <ClientEventClient event={event} />
              </div>

              {/* ========== STICKY SIDEBAR (desktop only) ========== */}
              <EventSidebar
                event={event}
                cityName={cityName}
                regionName={regionName}
                primaryPlaceSlug={primaryPlaceSlug}
                citySlug={citySlug}
                regionSlug={regionSlug}
              />
            </div>
          </article>
        </div>
      </div>

      {/* Latest News Section - Streamed separately to improve TTFB */}
      <Suspense fallback={null}>
        <LatestNewsSection
          placeSlug={primaryPlaceSlug}
          placeLabel={placeLabel}
          placeType={placeType}
          newsHref={newsHref}
        />
      </Suspense>

      {/* Sticky CTA bar for mobile — sits above bottom nav */}
      {temporalStatus.state !== "past" && (
        <EventStickyCTA
          eventUrl={event.url}
          eventSlug={event.slug}
          labels={{
            moreInfo: tEvent("stickyMoreInfo"),
            calendar: tEvent("stickyCalendar"),
            save: tEvent("stickySave"),
            favoriteAdd: tCard("favoriteAddAria"),
            favoriteRemove: tCard("favoriteRemoveAria"),
          }}
        />
      )}
    </>
  );
}
