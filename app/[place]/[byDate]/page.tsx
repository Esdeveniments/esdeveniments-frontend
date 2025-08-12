import Script from "next/script";
import { headers } from "next/headers";
import { fetchEvents, insertAds } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabel, toLocalDateString } from "@utils/helpers";
import { generatePagesData } from "@components/partials/generatePagesData";
import {
  buildPageMeta,
  generateItemListStructuredData,
} from "@components/partials/seo-meta";
import { today, tomorrow, week, weekend, twoWeeksDefault } from "@lib/dates";
import type { DateFunctions } from "types/dates";
import { PlaceTypeAndLabel, ByDateOptions } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import { FetchEventsParams, distanceToRadius } from "types/event";
import { fetchRegionsWithCities, fetchRegions } from "@lib/api/regions";
import HybridEventsList from "@components/ui/hybridEventsList";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";
import { parseFiltersFromUrl } from "@utils/url-filters";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string; byDate: string }>;
}) {
  const { place, byDate } = await params;

  const validation = validatePlaceForMetadata(place);
  if (!validation.isValid) {
    return validation.fallbackMetadata;
  }

  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    console.error("generateMetadata: Error fetching categories:", error);
  }

  const parsed = parseFiltersFromUrl(
    { place, date: byDate },
    new URLSearchParams(),
    categories
  );

  const actualDate = parsed.segments.date;
  const actualCategory = parsed.segments.category;

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabel(place);

  const categoryData = categories.find((cat) => cat.slug === actualCategory);

  const pageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place,
    byDate: actualDate as ByDateOptions,
    placeTypeLabel,
    category:
      actualCategory && actualCategory !== "tots" ? actualCategory : undefined,
    categoryName: categoryData?.name,
  });
  return buildPageMeta({
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
  });
}

export async function generateStaticParams() {
  const topPlaces = ["catalunya", "barcelona", "girona", "lleida", "tarragona"];
  const topDates = [
    "avui",
    "dema",
    "setmana",
    "cap-de-setmana",
  ] as ByDateOptions[];

  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    console.error("generateStaticParams: Error fetching categories:", error);
  }

  const topCategories = categories.slice(0, 4).map((cat) => cat.slug);
  const combinations = [];

  for (const place of topPlaces) {
    for (const date of topDates) {
      combinations.push({ place, byDate: date });
    }

    for (const category of topCategories) {
      combinations.push({ place, byDate: category });
    }
  }

  return combinations;
}

export default async function ByDatePage({
  params,
  searchParams,
}: {
  params: Promise<{ place: string; byDate: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { place, byDate } = await params;
  const search = await searchParams;

  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

  validatePlaceOrThrow(place);

  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    console.error(
      "🔥 [place]/[byDate]/page.tsx - Error fetching categories:",
      error
    );
    categories = [];
  }

  const parsed = parseFiltersFromUrl(
    { place, date: byDate },
    new URLSearchParams(),
    categories
  );

  const actualDate = parsed.segments.date;
  const actualCategory = parsed.segments.category;

  const searchCategory =
    typeof search.category === "string" ? search.category : undefined;
  const finalCategory = searchCategory || actualCategory;

  const dateFunctions: DateFunctions = {
    avui: today,
    dema: tomorrow,
    setmana: week,
    "cap-de-setmana": weekend,
  };

  const paramsForFetch: FetchEventsParams = {
    page: 0,
    size: 10,
  };

  // Only add date filters if actualDate is not "tots"
  if (actualDate !== "tots") {
    const selectedFunction =
      dateFunctions[actualDate as keyof typeof dateFunctions] || today;
    const { from, until } = selectedFunction();

    paramsForFetch.from = toLocalDateString(from);
    paramsForFetch.to = toLocalDateString(until);
  }

  if (place !== "catalunya") {
    paramsForFetch.place = place;
  }

  if (finalCategory && finalCategory !== "tots") {
    paramsForFetch.category = finalCategory;
  }

  // Add distance/radius filter if provided
  const distance =
    typeof search.distance === "string" ? search.distance : undefined;
  const lat = typeof search.lat === "string" ? search.lat : undefined;
  const lon = typeof search.lon === "string" ? search.lon : undefined;
  const query = typeof search.search === "string" ? search.search : undefined;

  // Add distance/radius filter if coordinates are provided
  if (lat && lon) {
    const maybeRadius = distanceToRadius(distance);
    if (maybeRadius !== undefined) {
      paramsForFetch.radius = maybeRadius;
    }
    paramsForFetch.lat = parseFloat(lat);
    paramsForFetch.lon = parseFloat(lon);
  }

  // Add search query if provided
  if (query) {
    paramsForFetch.term = query;
  }

  let noEventsFound = false;
  // Fetch events and place label in parallel when possible
  let [eventsResponse] = await Promise.all([fetchEvents(paramsForFetch)]);
  let events = eventsResponse?.content || [];

  if (!events || events.length === 0) {
    const regionsWithCities = await fetchRegionsWithCities();
    const regionWithCities = regionsWithCities.find((r) =>
      r.cities.some((city) => city.value === place)
    );

    if (regionWithCities) {
      const regions = await fetchRegions();
      const regionWithSlug = regions.find((r) => r.id === regionWithCities.id);

      if (regionWithSlug) {
        const { from, until } = twoWeeksDefault();
        const fallbackParams: FetchEventsParams = {
          page: 0,
          size: 7,
          place: regionWithSlug.slug,
          from: toLocalDateString(from),
          to: toLocalDateString(until),
        };

        if (finalCategory && finalCategory !== "tots") {
          fallbackParams.category = finalCategory;
        }

        eventsResponse = await fetchEvents(fallbackParams);
        events = eventsResponse?.content || [];
        noEventsFound = true;
      }
    }
  }

  // Final fallback: if still no events, fetch latest events with no filters (like Catalunya homepage)
  if (!events || events.length === 0) {
    const { from, until } = twoWeeksDefault();
    const latestEventsParams: FetchEventsParams = {
      page: 0,
      size: 7,
      from: toLocalDateString(from),
      to: toLocalDateString(until),
      // No place, category, or other filters - just get latest events
    };

    eventsResponse = await fetchEvents(latestEventsParams);
    events = eventsResponse?.content || [];
    noEventsFound = true;
  }

  const eventsWithAds = insertAds(events);

  // Optionally fetch a small featured strip scoped to place (not tied to byDate)
  let featured: typeof events = [];
  if (process.env.NEXT_PUBLIC_FEATURE_PROMOTED === "1") {
    try {
      const res = await fetchEvents({ page: 0, size: 6, place });
      featured = (res?.content || []).filter(isEventSummaryResponseDTO);
      if (featured.length < 3) {
        const res2 = await fetchEvents({ page: 0, size: 6 });
        featured = (res2?.content || []).filter(isEventSummaryResponseDTO);
      }
    } catch (e) {
      featured = [];
    }
  }

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabel(place);

  const categoryData = categories.find((cat) => cat.slug === finalCategory);

  const pageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place,
    byDate: actualDate as ByDateOptions,
    placeTypeLabel,
    category:
      finalCategory && finalCategory !== "tots" ? finalCategory : undefined,
    categoryName: categoryData?.name,
  });

  const serverHasMore = eventsResponse
    ? !eventsResponse.last &&
      eventsWithAds.length < eventsResponse.totalElements
    : false;

  const validEvents = eventsWithAds.filter(isEventSummaryResponseDTO);
  const structuredData =
    validEvents.length > 0
      ? generateItemListStructuredData(
          validEvents,
          finalCategory && finalCategory !== "tots"
            ? `Esdeveniments ${finalCategory} ${place}`
            : `Esdeveniments ${actualDate} ${place}`
        )
      : null;

  return (
    <>
      {/* JSON-LD Structured Data */}
      {structuredData && (
        <Script
          id={`events-${place}-${actualDate}`}
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
        category={finalCategory}
        date={actualDate}
        serverHasMore={serverHasMore}
      />

      {/* Client-side interactive layer (search, filters, floating button) */}
      <ClientInteractiveLayer
        categories={categories}
        placeTypeLabel={placeTypeLabel}
      />
    </>
  );
}
