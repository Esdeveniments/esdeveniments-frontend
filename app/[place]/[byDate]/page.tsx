import Script from "next/script";
import { fetchEvents, insertAds } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabel, toLocalDateString } from "@utils/helpers";
import { generatePagesData } from "@components/partials/generatePagesData";
import {
  buildPageMeta,
  generateItemListStructuredData,
} from "@components/partials/seo-meta";
import { today, tomorrow, week, weekend, twoWeeksDefault } from "@lib/dates";
import { PlaceTypeAndLabel, ByDateOptions } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import { FetchEventsParams } from "types/event";
import { fetchRegionsWithCities, fetchRegions } from "@lib/api/regions";
import HybridEventsList from "@components/ui/hybridEventsList";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";
import { parseFiltersFromUrl } from "@utils/url-filters";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";

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
  const topDates = ["avui", "dema", "cap-de-setmana"];

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

  const dateFunctions = {
    avui: today,
    dema: tomorrow,
    setmana: week,
    "cap-de-setmana": weekend,
  };

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
    to: toLocalDateString(until),
  };

  if (place !== "catalunya") {
    paramsForFetch.place = place;
  }

  if (finalCategory && finalCategory !== "tots") {
    paramsForFetch.category = finalCategory;
  }

  let noEventsFound = false;
  let eventsResponse = await fetchEvents(paramsForFetch);
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
        ({ from, until } = twoWeeksDefault());
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
