import { fetchEvents, insertAds } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabel, toLocalDateString } from "@utils/helpers";
import { generatePagesData } from "@components/partials/generatePagesData";
import { buildPageMeta } from "@components/partials/seo-meta";
import { today, tomorrow, week, weekend, twoWeeksDefault } from "@lib/dates";
import { PlaceTypeAndLabel, PageData, ByDateOptions } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import { FetchEventsParams } from "types/event";
import { fetchRegionsWithCities } from "@lib/api/regions";
import ServerEventsDisplay from "@components/ui/serverEventsDisplay";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";
import { parseFiltersFromUrl } from "@utils/url-filters";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import PlaceClient from "../PlaceClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string; byDate: string }>;
}) {
  const { place, byDate } = await params;

  // 🛡️ SECURITY: Validate place parameter
  const validation = validatePlaceForMetadata(place);
  if (!validation.isValid) {
    return validation.fallbackMetadata;
  }

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabel(place);
  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place,
    byDate: byDate as ByDateOptions,
    placeTypeLabel,
  });
  return buildPageMeta({
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
  });
}

export async function generateStaticParams() {
  const topPlaces = ["catalunya", "barcelona", "girona", "lleida", "tarragona"];
  const topDates = ["avui", "dema", "cap-de-setmana"];

  // Get dynamic categories for generating category-only URLs (e.g., /barcelona/festivals)
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    console.error("generateStaticParams: Error fetching categories:", error);
  }

  const topCategories = categories.slice(0, 4).map((cat) => cat.slug);
  const combinations = [];

  for (const place of topPlaces) {
    // Generate date-only URLs (e.g., /barcelona/avui)
    for (const date of topDates) {
      combinations.push({ place, byDate: date });
    }

    // Generate category-only URLs (e.g., /barcelona/festivals) - these represent category with default date
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

  // 🛡️ SECURITY: Validate place parameter
  validatePlaceOrThrow(place);

  // Fetch dynamic categories first for URL parsing
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
    console.log(
      "🔥 [place]/[byDate]/page.tsx - Fetched categories:",
      categories.length
    );
  } catch (error) {
    console.error(
      "🔥 [place]/[byDate]/page.tsx - Error fetching categories:",
      error
    );
    // Continue without categories - components will use static fallbacks
  }

  // Parse URL segments to determine if byDate is actually a date or category
  const parsed = parseFiltersFromUrl(
    { place, date: byDate },
    new URLSearchParams(),
    categories
  );

  // Extract the actual filter values from parsed URL
  const actualDate = parsed.segments.date;
  const actualCategory = parsed.segments.category;

  // Extract additional filters from search params
  const searchCategory =
    typeof search.category === "string" ? search.category : undefined;
  const finalCategory = searchCategory || actualCategory;

  // Use actualDate for date functions instead of byDate
  const dateFunctions = {
    avui: today,
    dema: tomorrow,
    setmana: week,
    "cap-de-setmana": weekend,
  };

  // If we have a category filter and date is "tots" (default), use broader range
  let selectedFunction;
  if (actualDate === "tots" && finalCategory && finalCategory !== "tots") {
    selectedFunction = twoWeeksDefault;
  } else {
    selectedFunction =
      dateFunctions[actualDate as keyof typeof dateFunctions] || today;
  }

  let { from, until } = selectedFunction();

  const paramsForFetch: FetchEventsParams = {
    page: 0,
    size: 10,
    from: toLocalDateString(from),
    until: toLocalDateString(until),
  };

  // Only add zone if place is not "catalunya" (catalunya is not a valid API zone)
  if (place !== "catalunya") {
    paramsForFetch.zone = place;
  }

  // Add category filter if present
  if (finalCategory && finalCategory !== "tots") {
    paramsForFetch.category = finalCategory;
  }

  let noEventsFound = false;
  let eventsResponse = await fetchEvents(paramsForFetch);
  let events = eventsResponse?.content || [];
  let totalServerEvents = eventsResponse?.totalElements || 0;

  if (!events || events.length === 0) {
    const regions = await fetchRegionsWithCities();
    const region = regions.find((r) =>
      r.cities.some((city) => city.value === place)
    );

    if (region) {
      ({ from, until } = twoWeeksDefault());
      const fallbackParams: FetchEventsParams = {
        page: 0,
        size: 7,
        zone: region.name,
        from: toLocalDateString(from),
        until: toLocalDateString(until),
      };

      // Keep category filter in fallback if present
      if (finalCategory && finalCategory !== "tots") {
        fallbackParams.category = finalCategory;
      }

      eventsResponse = await fetchEvents(fallbackParams);
      events = eventsResponse?.content || [];
      totalServerEvents = eventsResponse?.totalElements || 0;
      noEventsFound = true;
    }
  }

  const eventsWithAds = insertAds(events);

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabel(place);

  const pageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place,
    byDate: actualDate as ByDateOptions,
    placeTypeLabel,
  });

  return (
    <>
      {/* Initialize client hydration only */}
      <PlaceClient />

      {/* Server-rendered events content (SEO optimized) */}
      <ServerEventsDisplay
        events={eventsWithAds}
        placeTypeLabel={placeTypeLabel}
        pageData={pageData}
        noEventsFound={noEventsFound}
        hasServerFilters={true}
        place={place}
        category={finalCategory}
        date={actualDate}
        totalServerEvents={totalServerEvents}
        categories={categories}
      />

      {/* Client-side interactive layer (search, filters, floating button) */}
      <ClientInteractiveLayer categories={categories} />
    </>
  );
}
