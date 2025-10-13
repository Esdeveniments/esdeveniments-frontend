import Script from "next/script";
import { headers } from "next/headers";
import { fetchEvents, insertAds } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { fetchPlaces } from "@lib/api/places";
import { getPlaceTypeAndLabel, toLocalDateString } from "@utils/helpers";
import { generatePagesData } from "@components/partials/generatePagesData";
import {
  buildPageMeta,
  generateItemListStructuredData,
  generateWebPageSchema,
  generateCollectionPageSchema,
} from "@components/partials/seo-meta";
import { today, tomorrow, week, weekend, twoWeeksDefault } from "@lib/dates";
import type { DateFunctions } from "types/dates";
import { PlaceTypeAndLabel, ByDateOptions } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import type { PlaceResponseDTO } from "types/api/place";
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
import { highPrioritySlugs } from "@utils/priority-places";
import { VALID_DATES } from "@lib/dates";

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
  const topDates = VALID_DATES.filter(
    (date) => date !== "tots"
  ) as ByDateOptions[];

  let places: PlaceResponseDTO[] = [];
  try {
    places = await fetchPlaces();
  } catch (error) {
    console.warn("generateStaticParams: Error fetching places:", error);
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    // Fallback: use highPrioritySlugs directly as topPlaces will be set below
  }

  if (process.env.NODE_ENV === "production" && places.length === 0) {
    throw new Error("No places fetched in production");
  }

  // Filter high priority places to only include those that exist in API data
  // If places fetch failed, use highPrioritySlugs as fallback
  const topPlaces =
    places.length > 0
      ? highPrioritySlugs.filter((placeSlug) =>
          places.some((place) => place.slug === placeSlug)
        )
      : highPrioritySlugs;

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

  const serverHasMore = eventsResponse ? !eventsResponse.last : false;

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

  // Generate WebPage and CollectionPage schemas
  const webPageSchema = generateWebPageSchema({
    title: pageData.title,
    description: pageData.metaDescription,
    url: pageData.canonical,
  });

  const collectionSchema =
    validEvents.length > 0
      ? generateCollectionPageSchema({
          title: pageData.title,
          description: pageData.metaDescription,
          url: pageData.canonical,
          numberOfItems: validEvents.length,
        })
      : null;

  return (
    <>
      {/* JSON-LD Structured Data */}
      <Script
        id="webpage-schema"
        type="application/ld+json"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webPageSchema),
        }}
      />
      {collectionSchema && (
        <Script
          id="collection-schema"
          type="application/ld+json"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(collectionSchema),
          }}
        />
      )}
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
