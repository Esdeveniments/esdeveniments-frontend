import { Suspense } from "react";
import { generateJsonData } from "@utils/helpers";
import { getEventBySlug } from "@lib/api/events";
import { EventDetailResponseDTO } from "types/api/event";
import { Metadata } from "next";
import { siteUrl } from "@config/index";
import { generateEventMetadata } from "@lib/meta";
import { redirect, notFound } from "next/navigation";
import { connection } from "next/server";
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
import { locale as rootLocale } from "next/root-params";
import { withLocalePath, toLocalizedUrl } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";
import { getLocalizedCategoryLabelFromConfig } from "@utils/category-helpers";
import FavoriteButton from "@components/ui/common/favoriteButton";
import SponsorBannerSlot from "@components/ui/sponsor/SponsorBannerSlot";
import { buildResponsivePictureSourceUrls } from "@utils/image-cache";
import { getOptimalImageQuality, getResponsiveWidths, getOptimalImageSizes } from "@utils/image-quality";
import EventStickyCTA from "./components/EventStickyCTA";
import EventSidebar from "./components/EventSidebar";
import SocialProofCounter from "./components/SocialProofCounter";
import CollapsibleDescription from "./components/CollapsibleDescription";
import CulturalMessage from "@components/ui/common/culturalMessage";
import DetailSectionTracker from "./components/DetailSectionTracker";
import EventDetailSkeleton from "@components/ui/common/skeletons/EventDetailSkeleton";

// Lazy load below-the-fold client components via client component wrappers
import LazyRestaurantPromotion from "./components/LazyRestaurantPromotion";

export async function generateMetadata(props: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const slug = (await props.params).eventId;
  const locale = (await rootLocale()) as AppLocale;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "No event found" };
  const canonical = `${siteUrl}${withLocalePath(`/e/${event.slug}`, locale)}`;
  return generateEventMetadata(event, canonical, undefined, locale);
}

// Main page component
export default function EventPage({
  params,
}: Readonly<{
  params: Promise<{ eventId: string }>;
}>) {
  // All awaits (params, rootLocale, getEventBySlug) live inside the
  // Suspense child. Trade-off: notFound() becomes <meta noindex> and the
  // canonical slug redirect becomes client-side (no HTTP 3xx).
  return (
    <Suspense fallback={<EventDetailSkeleton />}>
      <EventPageGate paramsPromise={params} />
    </Suspense>
  );
}

async function EventPageGate({
  paramsPromise,
}: Readonly<{
  paramsPromise: Promise<{ eventId: string }>;
}>) {
  // Resolve params + locale concurrently so we can start the event fetch
  // as soon as both are available.
  const [{ eventId: slug }, locale] = await Promise.all([
    paramsPromise,
    rootLocale() as Promise<AppLocale>,
  ]);

  const event: EventDetailResponseDTO | null = await getEventBySlug(slug);
  if (!event) notFound();
  if (event.title === "CANCELLED") notFound();

  const disableCanonicalRedirect =
    process.env.NEXT_PUBLIC_CANONICAL_REDIRECT === "0" ||
    process.env.CANONICAL_REDIRECT === "0";
  if (!disableCanonicalRedirect && slug !== event.slug && event.slug) {
    redirect(withLocalePath(`/e/${event.slug}`, locale));
  }

  const title = event?.title ?? "";
  const jsonData = generateJsonData({ ...event }, locale);

  // Build first — so numberOfItems matches the items we actually emit
  // (ItemList.numberOfItems must equal itemListElement.length for valid Schema.org).
  const relatedEventListItems =
    event.relatedEvents
      ?.slice(0, 10)
      .map((relatedEvent, index) => {
        try {
          return {
            "@type": "ListItem" as const,
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
      .filter((item): item is NonNullable<typeof item> => item !== null) ?? [];

  const relatedEventsJsonData =
    relatedEventListItems.length > 0
      ? {
        "@id": `${siteUrl}#itemlist-${title
          ?.toLowerCase()
          .replace(/\s+/g, "-")}`,
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Related Events",
        numberOfItems: relatedEventListItems.length,
        itemListElement: relatedEventListItems,
      }
      : null;

  const lcpSources = event.imageUrl
    ? buildResponsivePictureSourceUrls(event.imageUrl, undefined, {
      quality: getOptimalImageQuality({ isPriority: true, isExternal: true }),
    }, getResponsiveWidths("hero"))
    : null;
  const lcpSizes = getOptimalImageSizes("hero");

  return (
    <>
      {lcpSources && (
        <link
          rel="preload"
          as="image"
          imageSrcSet={lcpSources.webpSrcSet}
          imageSizes={lcpSizes}
          type="image/webp"
          fetchPriority="high"
        />
      )}
      <JsonLdServer
        id={event.id ? String(event.id) : undefined}
        data={jsonData}
      />
      {relatedEventsJsonData && (
        <JsonLdServer
          id={`related-events-${event.id}`}
          data={relatedEventsJsonData}
        />
      )}
      <EventContent event={event} locale={locale} />
    </>
  );
}

async function EventContent({
  event,
  locale,
}: Readonly<{
  event: EventDetailResponseDTO;
  locale: AppLocale;
}>) {
  // With relaxed CSP we no longer require a nonce here; compute mobile on client
  const initialIsMobile = false;

  const eventSlug = event?.slug ?? "";
  const title = event?.title ?? "";
  const rawCityName = event.city?.name || "";
  const rawRegionName = event.region?.name || "";
  const cityName = formatPlaceName(rawCityName);
  const regionName = formatPlaceName(rawRegionName);
  const citySlug = event.city?.slug;
  const regionSlug = event.region?.slug;
  const primaryPlaceSlug = citySlug || regionSlug || "catalunya";
  const sponsorFallbackPlaces =
    citySlug && regionSlug
      ? [regionSlug].filter((p) => p !== primaryPlaceSlug)
      : undefined;
  const primaryCategorySlug = event.categories?.[0]?.slug;
  const explorePlaceHref = `/${primaryPlaceSlug}`;
  const exploreCategoryHref = primaryCategorySlug
    ? `/${primaryPlaceSlug}/${primaryCategorySlug}`
    : explorePlaceHref;
  const eventDateString = event.endDate
    ? `Del ${event.startDate} al ${event.endDate}`
    : `${event.startDate}`;

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
  // Signal dynamic rendering before using new Date() in computeTemporalStatus.
  // Without this, cacheComponents caches the RSC payload with a stale temporal state,
  // causing "Couldn't find all resumable slots" when the tree shape changes (e.g., upcoming → past).
  await connection();
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

  const introText = await buildEventIntroText(event, eventCopyLabels, locale);

  const placeLabel = cityName || regionName || "Catalunya";
  const placeType: "region" | "town" = event.city ? "town" : "region";
  const newsHref = withLocalePath(
    primaryPlaceSlug === "catalunya" ? "/noticies" : `/noticies/${primaryPlaceSlug}`,
    locale
  );

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

  const hasCity = Boolean(citySlug);
  const hasRegion = Boolean(regionSlug);

  const homeLabel = tBreadcrumbs("home");
  const breadcrumbItems = [
    { name: homeLabel, url: toLocalizedUrl("/", locale) },
    ...(hasRegion ? [{ name: regionName, url: toLocalizedUrl(`/${regionSlug}`, locale) }] : []),
    ...(hasCity ? [{ name: cityName, url: toLocalizedUrl(`/${citySlug}`, locale) }] : []),
    { name: breadcrumbName, url: toLocalizedUrl(`/e/${event.slug}`, locale) },
  ];
  const breadcrumbJsonLd = generateBreadcrumbList(breadcrumbItems);

  return (
    <>
      {howToJsonData && (
        <JsonLdServer id={`howto-${event.id}`} data={howToJsonData} />
      )}
      {breadcrumbJsonLd && (
        <JsonLdServer id={`breadcrumbs-${event.id}`} data={breadcrumbJsonLd} />
      )}
      <div className="w-full bg-background pb-10">
        <div className="container flex flex-col gap-section-y min-w-0">
          <article className="w-full flex flex-col gap-section-y">
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

            <div className="flex flex-col lg:flex-row lg:gap-8">
              <div className="flex-1 min-w-0 flex flex-col gap-section-y-sm">
                <div className="w-full flex flex-col">
                  <div className="w-full">
                    <EventMedia event={event} title={title} />
                  </div>
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

                <div className="flex flex-col gap-1">
                  <EventHeader title={title} temporalStatus={temporalStatus} />
                  <SocialProofCounter
                    visits={event.visits}
                    interestedLabel={tEvent("interested", { count: event.visits })}
                  />
                </div>

                <DetailSectionTracker section="calendar" className="lg:hidden">
                  <div data-calendar-section>
                    <EventCalendar event={event} compact />
                  </div>
                </DetailSectionTracker>

                <DetailSectionTracker section="description">
                  <CollapsibleDescription>
                    <EventDescription
                      description={event.description}
                      introText={introText}
                      locale={locale as AppLocale}
                      showTranslate={temporalStatus.state !== "past"}
                    />
                  </CollapsibleDescription>
                </DetailSectionTracker>

                <DetailSectionTracker section="location" className="lg:hidden">
                  <EventLocation
                    location={event.location}
                    cityName={cityName}
                    regionName={regionName}
                    citySlug={event.city?.slug}
                    regionSlug={event.region?.slug}
                  />
                </DetailSectionTracker>

                {temporalStatus.state !== "past" && (
                  <div className="lg:hidden">
                    <EventWeather weather={event.weather} />
                  </div>
                )}

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

                <div className="lg:hidden">
                  <SponsorBannerSlot
                    place={primaryPlaceSlug}
                    fallbackPlaces={sponsorFallbackPlaces}
                  />
                </div>

                {event.relatedEvents && event.relatedEvents.length > 0 && (
                  <DetailSectionTracker section="related_events">
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
                  </DetailSectionTracker>
                )}

                <CulturalMessage
                  location={cityName || regionName}
                  locationValue={event.city?.slug || event.region?.slug || ""}
                  locationType={placeType}
                />

                <DetailSectionTracker section="categories">
                  <EventCategories categories={event.categories} place={primaryPlaceSlug} />
                </DetailSectionTracker>

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

                <ClientEventClient event={event} />
              </div>

              <EventSidebar
                event={event}
                cityName={cityName}
                regionName={regionName}
                primaryPlaceSlug={primaryPlaceSlug}
                sponsorFallbackPlaces={sponsorFallbackPlaces}
              />
            </div>
          </article>
        </div>
      </div>

      <Suspense fallback={null}>
        <LatestNewsSection
          placeSlug={primaryPlaceSlug}
          placeLabel={placeLabel}
          placeType={placeType}
          newsHref={newsHref}
        />
      </Suspense>

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
