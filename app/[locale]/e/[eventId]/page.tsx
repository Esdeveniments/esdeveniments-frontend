import { Suspense, use } from "react";
import type { JSX } from "react";
import EventDetailSkeleton from "@components/ui/common/skeletons/EventDetailSkeleton";
import { generateJsonData } from "@utils/helpers";
import { getCachedEventBySlug } from "@lib/api/events";
import { cacheLife, cacheTag } from "next/cache";
import { eventsTag, eventTag } from "@lib/cache/tags";
import { Metadata } from "next";
import { siteUrl } from "@config/index";
import { generateEventMetadata } from "@lib/meta";
import { redirect, notFound } from "next/navigation";
import EventMedia from "./components/EventMedia";
import EventHeader from "./components/EventHeader";
import EventFacts from "./components/EventFacts";
import EventShareButton from "./components/EventShareButton";
import EventActionBar from "./components/EventActionBar";
import EventReportLink from "./components/EventReportLink";
import EventAdSlot from "./components/EventAdSlot";
import EventOrganizerCard from "./components/EventOrganizerCard";
import { buildEventStatusLabels, computeTemporalStatus } from "@utils/event-status";
import type { EventTemporalStatus } from "types/event-status";
import type { EventCopyLabels } from "types/common";
import PastEventBanner from "./components/PastEventBanner";
import FestaMajorHubLink from "@components/ui/festaMajor/FestaMajorHubLink";
import FestivityHubLink from "@components/ui/festivity/FestivityHubLink";
import NextEditionLink from "./components/NextEditionLink";
import { isFestaMajorTitle } from "@utils/festa-major-name";
import Breadcrumbs from "@components/ui/common/Breadcrumbs";
import PwaBackButton from "@components/ui/common/PwaBackButton";
import type {
  BreadcrumbNavItem,
  EventPageBodyProps,
  EventPageGateProps,
} from "types/props";
import type { EventDetailResponseDTO } from "types/api/event";
import EventDescription from "./components/EventDescription";
import EventCategories from "./components/EventCategories";
import { buildDisplayLocation, getEventVenue } from "@utils/location-helpers";
import { getEventVenueCoords } from "@utils/event-map";
import { isLongDescription } from "@utils/text-processing";
import {
  buildEventIntroText,
  formatCatalanA,
  formatPlaceName,
} from "@utils/helpers";
import {
  buildEventListItems,
  generateHowToSchema,
} from "@utils/schema-helpers";
import LatestNewsSection from "./components/LatestNewsSection";
import JsonLdServer from "@components/partials/JsonLdServer";
import { generateBreadcrumbList } from "@components/partials/seo-meta";
import ClientEventClient from "./components/ClientEventClient";
import EventLocation from "./components/EventLocation";
import EventWeather from "./components/EventWeather";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { withLocalePath, toLocalizedUrl } from "@utils/i18n-seo";
import { buildShareKitEvent } from "@utils/share-kit-event";
import type { AppLocale } from "types/i18n";
import { getCategoryLabel } from "@utils/category-helpers";
import FavoriteButton from "@components/ui/common/favoriteButton";
import SponsorBannerSlot from "@components/ui/sponsor/SponsorBannerSlot";
import { buildResponsivePictureSourceUrls } from "@utils/image-cache";
import { getOptimalImageQuality, getResponsiveWidths, getOptimalImageSizes } from "@utils/image-quality";
import EventSidebar from "./components/EventSidebar";
import CollapsibleDescription from "./components/CollapsibleDescription";
import CulturalMessage from "@components/ui/common/culturalMessage";
import DetailSectionTracker from "./components/DetailSectionTracker";
import EventMoreEvents from "./components/EventMoreEvents";
import EventRelatedEvents from "./components/EventRelatedEvents";
import EventOwnerBar from "./components/EventOwnerBar";

// Lazy load below-the-fold client components via client component wrappers
// This allows us to use ssr: false in Next.js 16 (required for client components)
import LazyRestaurantPromotion from "./components/LazyRestaurantPromotion";

// The body and the metadata both read the current time (status pill, 60-day
// noindex), which a stored page may only do inside "use cache". A 15 minute
// life keeps them fresh; Cloudflare already serves copies up to 90 minutes old.
const EVENT_PAGE_CACHE_LIFE = { stale: 300, revalidate: 900, expire: 86400 };

export async function generateMetadata(props: PageProps<"/[locale]/e/[eventId]">): Promise<Metadata> {
  const slug = (await props.params).eventId;
  const locale = (await rootLocale()) as AppLocale;
  return buildEventPageMetadata(slug, locale);
}

async function buildEventPageMetadata(
  slug: string,
  locale: AppLocale,
): Promise<Metadata> {
  "use cache";
  cacheLife(EVENT_PAGE_CACHE_LIFE);
  cacheTag(eventsTag, eventTag(slug));
  setRequestLocale(locale);
  // Use the request-independent reader: reading headers() here would make
  // metadata dynamic under cacheComponents and mismatch the prerendered shell.
  // It throws on transient errors — let that bubble so Next does NOT cache a
  // broken render (SWR keeps the previous good page); only a genuine 404
  // returns null below.
  const [event, t] = await Promise.all([
    getCachedEventBySlug(slug),
    getTranslations({ locale, namespace: "App.EventMeta" }),
  ]);
  if (!event) return { title: "No event found" };
  // Use canonical derived from the event itself to avoid locking old slugs
  // into metadata; this helps consolidate SEO to the canonical path.
  const canonical = `${siteUrl}${withLocalePath(`/e/${event.slug}`, locale)}`;
  return generateEventMetadata(
    event,
    canonical,
    undefined,
    locale,
    t("descriptionSuffix"),
  );
}

// Main page component: returns a Suspense boundary straight away so the shell
// flushes before any async work. Its fallback doesn't read params, so it also
// lands in the generic prerendered shell (event slugs are unknown at build
// time): a first load shows the skeleton, not a blank <main>. A loading.tsx
// would do the same but also wrap edita/ and promote/.
export default function EventPage({
  params,
}: PageProps<"/[locale]/e/[eventId]">) {
  return (
    <Suspense fallback={<EventDetailSkeleton />}>
      <EventPageGate params={params} />
    </Suspense>
  );
}

// Unwraps params and streams the page in under the same skeleton, plus a
// minimal sr-only h1 derived from the slug so crawlers see a heading even if
// the stream fails (broken env, error boundary, etc.).
function EventPageGate({ params }: EventPageGateProps) {
  const { eventId: slug } = use(params);

  return (
    <Suspense
      fallback={
        <>
          <h1 className="sr-only">{slug.replace(/-/g, " ")}</h1>
          <EventDetailSkeleton />
        </>
      }
    >
      <EventPageContent slug={slug} />
    </Suspense>
  );
}

// Place data shared by the request-time slots and the cached body.
function getPlaceContext(event: EventDetailResponseDTO, locale: AppLocale) {
  const cityName = formatPlaceName(event.city?.name || "");
  const regionName = formatPlaceName(event.region?.name || "");
  const citySlug = event.city?.slug;
  const regionSlug = event.region?.slug;
  const primaryPlaceSlug = citySlug || regionSlug || "catalunya";
  return {
    cityName,
    regionName,
    citySlug,
    regionSlug,
    primaryPlaceSlug,
    sponsorFallbackPlaces:
      citySlug && regionSlug
        ? [regionSlug].filter((p) => p !== primaryPlaceSlug)
        : undefined,
    placeLabel: cityName || regionName || "Catalunya",
    placeType: (event.city ? "town" : "region") as "town" | "region",
    newsHref: withLocalePath(
      primaryPlaceSlug === "catalunya" ? "/noticies" : `/noticies/${primaryPlaceSlug}`,
      locale
    ),
  };
}

async function EventPageContent({
  slug,
}: {
  slug: string;
}): Promise<JSX.Element> {
  // Cached reader ("use cache" + event tags), so Next can store this page and
  // serve it without a render. It throws on transient API errors: an outage is
  // never cached as "not found".
  const [locale, event] = await Promise.all([
    rootLocale() as Promise<AppLocale>,
    getCachedEventBySlug(slug),
  ]);

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

  const { primaryPlaceSlug, sponsorFallbackPlaces, placeLabel, placeType, newsHref } =
    getPlaceContext(event, locale);
  // Request-time parts stay outside the cached body and pass through it.
  const sponsorSlot = (
    <SponsorBannerSlot
      key="sponsor"
      place={primaryPlaceSlug}
      fallbackPlaces={sponsorFallbackPlaces}
    />
  );

  return (
    <EventPageBody
      slug={event.slug || slug}
      locale={locale}
      mobileSponsorSlot={sponsorSlot}
      sidebarSponsorSlot={sponsorSlot}
      latestNewsSlot={
        <Suspense key="latest-news" fallback={null}>
          <LatestNewsSection
            placeSlug={primaryPlaceSlug}
            placeLabel={placeLabel}
            placeType={placeType}
            newsHref={newsHref}
            sourceEventId={event.id ? String(event.id) : undefined}
            sourceEventSlug={event.slug || slug}
          />
        </Suspense>
      }
      moreEventsSlot={
        <Suspense
          key="more-events"
          fallback={
            <EventRelatedEvents
              events={event.relatedEvents ?? []}
              sourceEventId={event.id}
              sourceEventSlug={event.slug || slug}
            />
          }
        >
          <EventMoreEvents
            eventId={event.id}
            cityId={event.city?.id}
            citySlug={event.city?.slug}
            regionId={event.region?.id}
            relatedEvents={event.relatedEvents ?? []}
            sourceEventSlug={event.slug || slug}
          />
        </Suspense>
      }
      nextEditionSlot={
        event.city?.slug ? (
          <Suspense key="next-edition" fallback={null}>
            <NextEditionLink
              event={{
                slug: event.slug || slug,
                title: event.title,
                citySlug: event.city.slug,
              }}
              locale={locale}
            />
          </Suspense>
        ) : null
      }
    />
  );
}

async function EventPageBody({
  slug,
  locale,
  mobileSponsorSlot,
  sidebarSponsorSlot,
  latestNewsSlot,
  nextEditionSlot,
  moreEventsSlot,
}: EventPageBodyProps): Promise<JSX.Element | null> {
  "use cache";
  cacheLife(EVENT_PAGE_CACHE_LIFE);
  cacheTag(eventsTag, eventTag(slug));
  // The layout's setRequestLocale does not reach inside "use cache"; without
  // it next-intl falls back to reading headers(), which is not allowed here.
  setRequestLocale(locale);

  const event = await getCachedEventBySlug(slug);
  if (!event) return null;

  const {
    cityName,
    regionName,
    citySlug,
    regionSlug,
    primaryPlaceSlug,
    placeLabel,
    placeType,
  } = getPlaceContext(event, locale);
  const eventSlug = event?.slug ?? "";
  const title = event?.title ?? "";
  const primaryCategorySlug = event.categories?.[0]?.slug;
  const shareEvent = buildShareKitEvent(event, cityName || regionName, locale);
  const clientEvent = {
    id: event.id,
    slug: event.slug,
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    categorySlug: primaryCategorySlug,
    placeSlug: citySlug ?? regionSlug,
    hasImage: Boolean(event.imageUrl),
    origin: event.origin,
    ownerId: event.owner?.id,
    share: shareEvent,
  };
  const explorePlaceHref = `/${primaryPlaceSlug}`;
  const exploreCategoryHref = primaryCategorySlug
    ? `/${primaryPlaceSlug}/${primaryCategorySlug}`
    : explorePlaceHref;
  const jsonData = generateJsonData({ ...event }, locale);

  // Parallelize all translation fetches to eliminate waterfall (7 calls → 1 round trip)
  const [
    tStatus,
    tEvent,
    tCard,
    tCopy,
    tCategories,
    tHowTo,
    tBreadcrumbs,
  ] = await Promise.all([
    getTranslations({ locale, namespace: "Utils.EventStatus" }),
    getTranslations({ locale, namespace: "Components.EventPage" }),
    getTranslations({ locale, namespace: "Components.CardContent" }),
    getTranslations({ locale, namespace: "Utils.EventCopy" }),
    getTranslations({ locale, namespace: "Config.Categories" }),
    getTranslations({ locale, namespace: "Components.HowTo" }),
    getTranslations({ locale, namespace: "Components.Breadcrumbs" }),
  ]);
  const primaryCategoryLabel = primaryCategorySlug
    ? getCategoryLabel(
      primaryCategorySlug,
      event.categories?.[0]?.name || primaryCategorySlug,
      tCategories
    )
    : "";
  const statusLabels = buildEventStatusLabels(tStatus);
  const eventCopyLabels: EventCopyLabels = {
    sentence: {
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

  // Generate JSON-LD for related events (server-side for SEO)
  const relatedEventsJsonData =
    event.relatedEvents && event.relatedEvents.length > 0
      ? {
        // Anchor the ItemList @id to the event's canonical URL with a stable
        // fixed fragment — avoids homepage-scoped @id and fragile title slugs.
        "@id": `${siteUrl}${withLocalePath(`/e/${event.slug}`, locale)}#related-events`,
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Related Events",
        url: `${siteUrl}${withLocalePath(`/e/${event.slug}`, locale)}`,
        numberOfItems: Math.min(event.relatedEvents.length, 10),
        itemListElement: buildEventListItems(
          event.relatedEvents.slice(0, 10),
          locale
        ),
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
    if (placeLabel) {
      return `Esdeveniment ${formatCatalanA(placeLabel, "general", false)}`;
    }
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

  // Preload LCP hero image — React 19 hoists <link> to <head> automatically.
  // Uses responsive srcSet so the browser picks the right width for the viewport,
  // instead of always downloading the full 1200px version on mobile.
  const lcpSources = event.imageUrl
    ? buildResponsivePictureSourceUrls(event.imageUrl, undefined, {
      quality: getOptimalImageQuality({ isPriority: true, isExternal: true }),
    }, getResponsiveWidths("hero"))
    : null;
  const lcpSizes = getOptimalImageSizes("hero");

  const venue = getEventVenue(event.location, title);
  // Venue plus its town once ("Tesr, Aguilar de Segarra, Bages" stays as is).
  const placeText = buildDisplayLocation({
    location: venue,
    cityName,
    regionName: cityName ? "" : regionName,
  });
  // Short texts show whole; long ones fold on mobile behind "Llegeix més".
  const isLongText = isLongDescription(`${introText ?? ""}\n${event.description ?? ""}`);

  return (
    <>
      {/* Preload LCP hero image for faster Largest Contentful Paint */}
      {lcpSources && (
        <link
          rel="preload"
          as="image"
          href={lcpSources.webp}
          imageSrcSet={lcpSources.webpSrcSet}
          imageSizes={lcpSizes}
          type="image/webp"
          fetchPriority="high"
        />
      )}
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
            {/* PWA back button — only renders in installed standalone mode */}
            <PwaBackButton fallbackHref="/" />
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
              ] as BreadcrumbNavItem[]}
              className="px-section-x pt-4"
            />

            {/* Two-column layout: Main content + sidebar (desktop) */}
            <div className="flex flex-col lg:flex-row lg:gap-8">
              {/* ========== MAIN CONTENT (left column) ==========
                  One left edge: the column is padded once, sections add none. */}
              <div className="flex-1 min-w-0 flex flex-col gap-section-y-sm px-section-x">
                {/* No image, no box: the page then starts with the title. */}
                <EventMedia event={event} title={title} />

                <div className="flex flex-col gap-element-gap">
                  <EventHeader
                    title={title}
                    temporalStatus={temporalStatus}
                    visits={event.visits}
                    interestedLabel={tEvent("interested", { count: event.visits })}
                    owner={event.owner}
                    actions={
                      <>
                        <EventShareButton shareEvent={shareEvent} />
                        {shouldShowFavoriteButton && (
                          <FavoriteButton
                            eventSlug={event.slug}
                            eventId={event.id ? String(event.id) : undefined}
                            initialIsFavorite={false}
                            labels={favoriteLabels}
                          />
                        )}
                      </>
                    }
                  >
                    {citySlug && cityName && isFestaMajorTitle(event.title) && (
                      <FestaMajorHubLink citySlug={citySlug} cityName={cityName} />
                    )}
                    <FestivityHubLink title={event.title} />
                    {temporalStatus.state === "past" && nextEditionSlot}
                  </EventHeader>

                  {/* Mobile: date, time, place, price. Desktop: place only
                      (the sidebar card has the rest). */}
                  <EventFacts event={event} placeText={placeText} placeOnlyOnDesktop />

                  <EventOwnerBar
                    ownerId={event.owner?.id}
                    slug={eventSlug}
                    shareEvent={shareEvent}
                  />
                </div>

                <DetailSectionTracker section="description">
                  <CollapsibleDescription collapsible={isLongText}>
                    <EventDescription
                      slug={event.slug}
                      description={event.description}
                      introText={introText}
                      locale={locale as AppLocale}
                      showTranslate={temporalStatus.state !== "past"}
                    />
                  </CollapsibleDescription>
                </DetailSectionTracker>

                {/* Location, weather and organizer — mobile only (desktop: sidebar) */}
                <DetailSectionTracker section="location" className="lg:hidden">
                  <EventLocation
                    location={venue}
                    cityName={cityName}
                    regionName={regionName}
                    citySlug={event.city?.slug}
                    regionSlug={event.region?.slug}
                    profile={event.profile}
                    venueCoords={getEventVenueCoords(event)}
                  />
                </DetailSectionTracker>

                {temporalStatus.state !== "past" && (
                  <div className="lg:hidden">
                    <EventWeather weather={event.weather} />
                  </div>
                )}

                {event.owner && (
                  <DetailSectionTracker section="organizer" className="lg:hidden">
                    <EventOrganizerCard owner={event.owner} />
                  </DetailSectionTracker>
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
                <div className="lg:hidden">{mobileSponsorSlot}</div>

                {/* Promoted, then related events — request-time slot */}
                {moreEventsSlot}

                {/* Explore more plans — after related events, before categories */}
                <CulturalMessage
                  location={cityName || regionName}
                  locationValue={event.city?.slug || event.region?.slug || ""}
                  locationType={placeType}
                />

                {/* Event Categories */}
                <DetailSectionTracker section="categories">
                  <EventCategories categories={event.categories} place={primaryPlaceSlug} />
                </DetailSectionTracker>

                <EventReportLink
                  ownerId={event.owner?.id}
                  title={title}
                  url={toLocalizedUrl(`/e/${eventSlug}`, locale)}
                />

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

                <EventAdSlot />

                {/* Notifications, owner upsell and analytics */}
                <ClientEventClient event={clientEvent} />
              </div>

              {/* ========== SIDEBAR (desktop only) ========== */}
              <EventSidebar
                event={event}
                cityName={cityName}
                regionName={regionName}
                sponsorSlot={sidebarSponsorSlot}
              />
            </div>
          </article>
        </div>
      </div>

      {/* Latest News Section - request-time, streamed separately */}
      {latestNewsSlot}

      {/* Mobile action bar: server-rendered and fixed, so it never shifts the page */}
      {temporalStatus.state !== "past" && <EventActionBar event={event} locale={locale} />}
    </>
  );
}
