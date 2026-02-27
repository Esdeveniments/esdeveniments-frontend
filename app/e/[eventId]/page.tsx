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
import ViewCounter from "@components/ui/viewCounter";
import EventHeader from "./components/EventHeader";
import EventCalendar from "./components/EventCalendar";
import { buildEventStatusLabels, computeTemporalStatus } from "@utils/event-status";
import type { EventTemporalStatus } from "types/event-status";
import type { EventCopyLabels } from "types/common";
import { getFormattedDate } from "@utils/helpers";
import PastEventBanner from "./components/PastEventBanner";
import Breadcrumbs from "@components/ui/common/Breadcrumbs";
import type { BreadcrumbNavItem } from "types/props";
import EventDescription from "./components/EventDescription";
import EventCategories from "./components/EventCategories";
import EventsAroundSection from "@components/ui/eventsAround/EventsAroundSection";
import {
  MegaphoneIcon as SpeakerphoneIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
const InfoIcon = InformationCircleIcon;
import EventDetailsSection from "./components/EventDetailsSection";
import SectionHeading from "@components/ui/common/SectionHeading";
import {
  buildEventIntroText,
  buildFaqItems,
  buildFaqJsonLd,
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
import EventOwnerActions from "@components/ui/auth/EventOwnerActions";
import SponsorBannerSlot from "@components/ui/sponsor/SponsorBannerSlot";

// Lazy load below-the-fold client components via client component wrappers
// This allows us to use ssr: false in Next.js 16 (required for client components)
import LazyRestaurantPromotion from "./components/LazyRestaurantPromotion";
import LazyAdArticleIsland from "./components/LazyAdArticleIsland";

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
      moreInfoQ: tCopy("faq.moreInfoQ"),
      moreInfoA: tCopy("faq.moreInfoA"),
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
    event.endDate,
    locale
  );

  const statusMeta = {
    state: temporalStatus.state,
    label: temporalStatus.label,
  };

  const shouldShowFavoriteButton = Boolean(event.slug);
  const favoriteLabels = {
    add: tCard("favoriteAddAria"),
    remove: tCard("favoriteRemoveAria"),
  };

  // Build intro and FAQ via shared utils (no assumptions)
  const introText = await buildEventIntroText(event, eventCopyLabels, locale);
  const faqItems = await buildFaqItems(event, eventCopyLabels, locale);
  const faqJsonLd = buildFaqJsonLd(faqItems);

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
            {/* Visible Breadcrumbs for internal linking */}
            <Breadcrumbs
              items={[
                { label: tBreadcrumbs("home"), href: "/" },
                // Add region (comarca) if available
                ...(hasRegion
                  ? [{ label: regionName, href: `/${regionSlug}` }]
                  : []),
                // Add city if available (different from region)
                ...(hasCity
                  ? [{ label: cityName, href: `/${citySlug}` }]
                  : []),
                // Add category if available
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
                  <ViewCounter visits={event.visits} />
                </div>
              </div>
            </div>{" "}
            {/* Event Header with status pill - Server-side rendered */}
            <EventHeader title={title} statusMeta={statusMeta} />
            <EventOwnerActions
              eventSlug={event.slug}
              eventCreatorId={event.creatorId}
              eventProfileSlug={event.profile?.slug}
            />
            {/* Sponsor banner slot - near top for visibility */}
            {/* Cascade: town → region → country (specificity wins) */}
            <SponsorBannerSlot
              place={primaryPlaceSlug}
              fallbackPlaces={[
                // If primaryPlaceSlug is city, add region as first fallback
                ...(citySlug && regionSlug ? [regionSlug] : []),
                // Catalunya as ultimate fallback
                "catalunya",
              ].filter((p) => p !== primaryPlaceSlug)}
            />
            {/* Event Calendar - Server-side rendered */}
            <EventCalendar event={event} />
            {/* Event Description - bring core info immediately */}
            <EventDescription
              description={event.description}
              locationValue={event.city?.slug || event.region?.slug || ""}
              location={cityName || regionName}
              introText={introText}
              locationType="town"
              locale={locale as AppLocale}
              showTranslate={temporalStatus.state !== "past"}
            />
            {/* Location (SSR for SEO) with client map toggle */}
            <EventLocation
              location={event.location}
              cityName={cityName}
              regionName={regionName}
              citySlug={event.city?.slug}
              regionSlug={event.region?.slug}
              profile={event.profile}
            />
            {/* Related Events - Server-side rendered for SEO */}
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
            {/* Event Categories - Server-side rendered for SEO */}
            <EventCategories categories={event.categories} place={primaryPlaceSlug} />
            {/* Event details (status, duration, external url) - server-rendered */}
            <EventDetailsSection
              event={event}
              temporalStatus={temporalStatus}
              formattedStart={formattedStart}
              formattedEnd={formattedEnd}
              nameDay={nameDay}
            />
            {/* Weather - Server component (converted from client for better performance) */}
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
            {/* Restaurant Promotion Section - Lazy loaded (below fold, uses intersection observer) */}
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
            {/* Final Ad Section - Lazy loaded (ads should not block initial render) */}
            <div className="w-full h-full min-h-[250px]">
              <div className="w-full flex flex-col gap-element-gap">
                <SectionHeading
                  Icon={SpeakerphoneIcon}
                  iconClassName="w-5 h-5 text-foreground-strong flex-shrink-0"
                  title={tEvent("sponsored")}
                  titleClassName="heading-2"
                />
                <div className="px-section-x">
                  <Suspense fallback={<div className="w-full h-[250px] bg-muted animate-pulse rounded" />}>
                    <LazyAdArticleIsland slot="9643657007" />
                  </Suspense>
                </div>
              </div>
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

      {/* FAQ JSON-LD (only when we have 2+ items) */}
      {faqJsonLd && <JsonLdServer id={`faq-${event.id}`} data={faqJsonLd} />}
    </>
  );
}
