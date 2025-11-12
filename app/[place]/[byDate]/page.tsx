import { fetchEvents, insertAds } from "@lib/api/events";
import { getCategories, fetchCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabelCached, toLocalDateString } from "@utils/helpers";
import { hasNewsForPlace } from "@lib/api/news";
import { generatePagesData } from "@components/partials/generatePagesData";
import {
  buildPageMeta,
  generateItemListStructuredData,
  generateWebPageSchema,
  generateCollectionPageSchema,
} from "@components/partials/seo-meta";
import { twoWeeksDefault, getDateRangeFromByDate } from "@lib/dates";
import { PlaceTypeAndLabel, ByDateOptions } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import { FetchEventsParams } from "types/event";
import { fetchRegionsWithCities, fetchRegions } from "@lib/api/regions";
import PlacePageShell from "@components/partials/PlacePageShell";
import {
  parseFiltersFromUrl,
  getRedirectUrl,
  toUrlSearchParams,
  buildFallbackUrlForInvalidPlace,
} from "@utils/url-filters";
import { applyDistanceToParams } from "@utils/api-helpers";
import { redirect } from "next/navigation";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { topStaticGenerationPlaces } from "@utils/priority-places";
import { VALID_DATES } from "@lib/dates";
import { fetchPlaces, fetchPlaceBySlug } from "@lib/api/places";
import { isValidCategorySlugFormat } from "@utils/category-mapping";

// page-level ISR not set here; fetch-level caching applies
export const revalidate = 600;
// Allow dynamic params not in generateStaticParams (default behavior, explicit for clarity)
export const dynamicParams = true;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ place: string; byDate: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ place, byDate }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const validation = validatePlaceForMetadata(place);
  if (!validation.isValid) {
    return validation.fallbackMetadata;
  }

  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await getCategories();
  } catch (error) {
    console.error("generateMetadata: Error fetching categories:", error);
  }

  // Convert searchParams to URLSearchParams for parsing
  const canonicalSearchParams = toUrlSearchParams(rawSearchParams);

  // Preserve user-requested category even if categories API fails
  if (categories.length === 0) {
    const fallbackSlug = canonicalSearchParams.get("category");
    if (fallbackSlug && isValidCategorySlugFormat(fallbackSlug)) {
      categories = [{ id: -1, name: fallbackSlug, slug: fallbackSlug }];
    }
  }

  const parsed = parseFiltersFromUrl(
    { place, date: byDate },
    canonicalSearchParams,
    categories
  );

  const actualDate = parsed.segments.date;
  const actualCategory = parsed.segments.category;

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabelCached(
    place
  );

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
  // Only generate static pages for top ~15 places to keep build size under 230MB
  // Other places will be generated on-demand with ISR (revalidate: 600)
  // Runtime validation (validatePlaceOrThrow) handles invalid slugs gracefully

  // Validate places exist in API to avoid generating pages for removed/renamed places
  let places: { slug: string }[] = [];
  try {
    places = await fetchPlaces();
  } catch (error) {
    console.warn(
      "generateStaticParams: Error fetching places for validation:",
      error
    );
    // Fallback: use hardcoded list if API fails (runtime validation will handle invalid slugs)
    places = [];
  }

  // Validate categories exist in API to avoid generating pages for removed/renamed categories
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    console.warn(
      "generateStaticParams: Error fetching categories for validation:",
      error
    );
    // Fallback: use hardcoded list if API fails (runtime validation will handle invalid slugs)
    categories = [];
  }

  // Filter to only places that exist in API
  const placeSlugs = new Set(places.map((p) => p.slug));
  const validPlaces =
    places.length > 0
      ? topStaticGenerationPlaces.filter((slug) => placeSlugs.has(slug))
      : topStaticGenerationPlaces; // Fallback if API failed

  const topDates = VALID_DATES.filter(
    (date) => date !== "tots"
  ) as ByDateOptions[];

  // Get top categories from dynamic data or fall back to legacy
  // Validate categories exist in API to avoid generating pages for removed/renamed categories
  let topCategories: string[] = [];
  if (categories.length > 0) {
    // Use first 4 dynamic categories (same as getTopStaticCombinations)
    const categorySlugs = new Set(categories.map((cat) => cat.slug));
    const dynamicTopCategories = categories.slice(0, 4).map((cat) => cat.slug);

    // Also validate legacy categories if they exist in API
    const legacyCategories = [
      "concerts",
      "festivals",
      "espectacles",
      "familia",
    ];
    const validLegacyCategories = legacyCategories.filter((slug) =>
      categorySlugs.has(slug)
    );

    // Prefer dynamic categories, but include valid legacy ones
    topCategories = Array.from(
      new Set([...dynamicTopCategories, ...validLegacyCategories])
    ).slice(0, 4); // Limit to 4 total
  } else {
    // Fallback to hardcoded legacy categories if API failed
    topCategories = ["concerts", "festivals", "espectacles", "familia"];
  }

  const combinations = [];

  for (const place of validPlaces) {
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

  // 🛡️ SECURITY: Early place existence check to prevent DoS via arbitrary slug enumeration
  // This validates the place exists in the API before any expensive operations
  // Special case: "catalunya" is always valid (homepage equivalent)
  if (place !== "catalunya") {
    let placeExists: unknown = null;
    try {
      placeExists = await fetchPlaceBySlug(place);
    } catch (error) {
      // Transient errors (500, network failures, etc.) - log but continue
      // The page will handle gracefully, and the error might be transient
      console.error(
        `Error checking place existence for ${place}, continuing anyway:`,
        error
      );
    }
    if (!placeExists) {
      // Place definitively doesn't exist - redirect to default place preserving intent
      const target = buildFallbackUrlForInvalidPlace({
        byDate,
        rawSearchParams: search,
      });
      redirect(target);
    }
  }

  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await getCategories();
  } catch (error) {
    console.error(
      "🔥 [place]/[byDate]/page.tsx - Error fetching categories:",
      error
    );
    categories = [];
  }

  // Convert searchParams to URLSearchParams for parsing
  const urlSearchParams = toUrlSearchParams(search);

  // Preserve user-requested category even if categories API fails
  if (categories.length === 0) {
    const fallbackSlug = urlSearchParams.get("category");
    if (fallbackSlug && isValidCategorySlugFormat(fallbackSlug)) {
      categories = [{ id: -1, name: fallbackSlug, slug: fallbackSlug }];
    }
  }

  const parsed = parseFiltersFromUrl(
    { place, date: byDate },
    urlSearchParams,
    categories
  );

  // Canonicalization note:
  // - Middleware handles structural normalization (folding query date/category, omitting "tots")
  // - This page-level redirect remains to validate category slugs against dynamic categories
  //   and normalize unknown slugs (middleware cannot fetch categories at edge time)
  // - When middleware already normalized, this is a no-op
  const redirectUrl = getRedirectUrl(parsed);
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const actualDate = parsed.segments.date;
  const actualCategory = parsed.segments.category;

  const searchCategory =
    typeof search.category === "string" ? search.category : undefined;
  const finalCategory = searchCategory || actualCategory;

  const paramsForFetch: FetchEventsParams = {
    page: 0,
    size: 10,
  };

  // Only add date filters if actualDate is not "tots"
  const dateRange = getDateRangeFromByDate(actualDate);
  if (dateRange) {
    paramsForFetch.from = toLocalDateString(dateRange.from);
    paramsForFetch.to = toLocalDateString(dateRange.until);
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
  applyDistanceToParams(paramsForFetch, {
    lat,
    lon,
    distance,
  });

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

  // Fetch place type and check news in parallel for better performance
  const [placeTypeLabel, hasNews] = await Promise.all([
    getPlaceTypeAndLabelCached(place),
    hasNewsForPlace(place),
  ]);

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
    <PlacePageShell
      scripts={[
        { id: "webpage-schema", data: webPageSchema },
        ...(collectionSchema
          ? [{ id: "collection-schema", data: collectionSchema }]
          : []),
        ...(structuredData
          ? [{ id: `events-${place}-${actualDate}`, data: structuredData }]
          : []),
      ]}
      initialEvents={eventsWithAds}
      placeTypeLabel={placeTypeLabel}
      pageData={pageData}
      noEventsFound={noEventsFound}
      place={place}
      category={finalCategory}
      date={actualDate}
      serverHasMore={serverHasMore}
      categories={categories}
      hasNews={hasNews}
    />
  );
}
