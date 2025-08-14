import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Script from "next/script";
import { fetchEvents, insertAds } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import { fetchRegionsWithCities, fetchRegions } from "@lib/api/regions";
import { generatePagesData } from "@components/partials/generatePagesData";
import {
  buildPageMeta,
  generateItemListStructuredData,
} from "@components/partials/seo-meta";
import type {
  PlaceStaticPathParams,
  PlaceTypeAndLabel,
  PageData,
} from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import type { EventCategory } from "@store";
import { FetchEventsParams } from "types/event";
import { distanceToRadius } from "types/event";
import HybridEventsList from "@components/ui/hybridEventsList";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";
import { buildCanonicalUrl } from "@utils/url-filters";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { fetchCities } from "@lib/api/cities";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import PromoStripTracker from "@components/ui/promotions/PromoStripTracker";
import FeaturedEventsSection from "@components/ui/featuredEvents/FeaturedEventsSection";

export const revalidate = 600;

export async function generateStaticParams() {
  const [regions, cities] = await Promise.all([fetchRegions(), fetchCities()]);

  return [
    ...regions.map((region) => ({ place: region.slug })),
    ...cities.map((city) => ({ place: city.slug })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PlaceStaticPathParams>;
}) {
  const { place } = await params;

  const validation = validatePlaceForMetadata(place);
  if (!validation.isValid) {
    return validation.fallbackMetadata;
  }

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabel(place);
  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place,
    byDate: "",
    placeTypeLabel,
  });
  return buildPageMeta({
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
  });
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<PlaceStaticPathParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { place } = await params;
  const search = await searchParams;

  // Read the nonce from the middleware headers
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

  validatePlaceOrThrow(place);

  const urlSearchParams = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (typeof value === "string") {
      urlSearchParams.set(key, value);
    } else if (Array.isArray(value)) {
      urlSearchParams.set(key, value[0]);
    }
  });

  const category =
    typeof search.category === "string" ? search.category : undefined;
  const date = typeof search.date === "string" ? search.date : undefined;
  const distance =
    typeof search.distance === "string" ? search.distance : undefined;
  const lat = typeof search.lat === "string" ? search.lat : undefined;
  const lon = typeof search.lon === "string" ? search.lon : undefined;
  const query = typeof search.search === "string" ? search.search : undefined;

  if (category || date) {
    const canonicalUrl = buildCanonicalUrl({
      place,
      byDate: date || "tots",
      category: (category as EventCategory) || "tots",
      searchTerm: query || "",
      distance: distance ? parseInt(distance) : 50,
      lat: lat ? parseFloat(lat) : undefined,
      lon: lon ? parseFloat(lon) : undefined,
    });

    redirect(canonicalUrl);
  }

  const fetchParams: FetchEventsParams = {
    page: 0,
    size: 10,
  };

  if (place !== "catalunya") {
    fetchParams.place = place;
  }

  if (category) fetchParams.category = category;

  // Add distance/radius filter if coordinates are provided
  if (lat && lon) {
    const maybeRadius = distanceToRadius(distance);
    if (maybeRadius !== undefined) {
      fetchParams.radius = maybeRadius;
    }
    fetchParams.lat = parseFloat(lat);
    fetchParams.lon = parseFloat(lon);
  }

  // Add search query if provided
  if (query) {
    fetchParams.term = query;
  }

  // Fetch events and categories in parallel when safe to do so later
  let eventsResponse = await fetchEvents(fetchParams);
  let noEventsFound = false;

  if (
    !eventsResponse ||
    !eventsResponse.content ||
    eventsResponse.content.length === 0
  ) {
    const regionsWithCities = await fetchRegionsWithCities();
    const regionWithCities = regionsWithCities.find((r) =>
      r.cities.some((city) => city.value === place)
    );

    if (regionWithCities) {
      const regions = await fetchRegions();
      const regionWithSlug = regions.find((r) => r.id === regionWithCities.id);

      if (regionWithSlug) {
        eventsResponse = await fetchEvents({
          page: 0,
          size: 7,
          place: regionWithSlug.slug,
        });
        noEventsFound = true;
      }
    }
  }

  // Final fallback: if still no events, fetch latest events with no filters (like Catalunya homepage)
  if (
    !eventsResponse ||
    !eventsResponse.content ||
    eventsResponse.content.length === 0
  ) {
    eventsResponse = await fetchEvents({
      page: 0,
      size: 7,
      // No place, category, or other filters - just get latest events
    });
    noEventsFound = true;
  }

  const events = eventsResponse?.content || [];
  const eventsWithAds = insertAds(events);

  // Optionally fetch a small featured strip scoped to place
  let featured: typeof events = [];
  if (process.env.NEXT_PUBLIC_FEATURE_PROMOTED === "1") {
    try {
      const res = await fetchEvents({ page: 0, size: 6, place });
      featured = (res?.content || []).filter(isEventSummaryResponseDTO);
      // Fallback to global latest if empty
      if (featured.length < 3) {
        const res2 = await fetchEvents({ page: 0, size: 6 });
        featured = (res2?.content || []).filter(isEventSummaryResponseDTO);
      }
    } catch {
      featured = [];
    }
  }

  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    console.error("Error fetching categories:", error);
  }

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabel(place);

  const pageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place,
    byDate: "",
    placeTypeLabel,
  });

  const validEvents = events.filter(isEventSummaryResponseDTO);
  const structuredData =
    validEvents.length > 0
      ? generateItemListStructuredData(validEvents, `Esdeveniments ${place}`)
      : null;

  return (
    <>
      {/* JSON-LD Structured Data */}
      {structuredData && (
        <Script
          id={`events-${place}`}
          type="application/ld+json"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      )}

      {process.env.NEXT_PUBLIC_FEATURE_PROMOTED === "1" && featured.length >= 3 && (
        <section
          aria-labelledby="featured-heading"
          className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-6"
        >
          <h2 id="featured-heading" className="uppercase mb-2 px-2 lg:px-0">
            Destacats
          </h2>
          <EventsAroundServer
            events={featured}
            layout="horizontal"
            usePriority
            showJsonLd={false}
            title="Destacats"
          />
        </section>
      )}

      {/* Server-rendered events content (SEO optimized) */}
      <HybridEventsList
        initialEvents={eventsWithAds}
        placeTypeLabel={placeTypeLabel}
        pageData={pageData}
        noEventsFound={noEventsFound}
        place={place}
        category={category}
        date={date}
        serverHasMore={!eventsResponse?.last}
      />

      {/* Bottom promoted businesses strip */}
      {process.env.NEXT_PUBLIC_FEATURE_PROMOTED === "1" && featured.length >= 3 && (
        <FeaturedEventsSection title="Empreses de proximitat" place={place} placement="place_bottom" pageType="place" />
      )}

      {/* Client-side interactive layer (search, filters, floating button) */}
      <ClientInteractiveLayer
        categories={categories}
        placeTypeLabel={placeTypeLabel}
      />
    </>
  );
}
