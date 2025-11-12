import { fetchEvents, insertAds } from "@lib/api/events";
import { getCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { hasNewsForPlace } from "@lib/api/news";
import { generatePagesData } from "@components/partials/generatePagesData";
import {
  buildPageMeta,
  generateItemListStructuredData,
  generateWebPageSchema,
  generateCollectionPageSchema,
} from "@components/partials/seo-meta";
import type { PlaceTypeAndLabel, PageData, ByDateOptions } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import { FetchEventsParams } from "types/event";
import PlacePageShell from "@components/partials/PlacePageShell";
import {
  parseFiltersFromUrl,
  urlToFilterState,
  getTopStaticCombinations,
  getRedirectUrl,
  toUrlSearchParams,
} from "@utils/url-filters";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { fetchRegionsWithCities, fetchRegions } from "@lib/api/regions";
import { fetchPlaces } from "@lib/api/places";
import { toLocalDateString } from "@utils/helpers";
import { twoWeeksDefault, getDateRangeFromByDate } from "@lib/dates";
import { redirect } from "next/navigation";

export const revalidate = 600;
// Allow dynamic params not in generateStaticParams (default behavior, explicit for clarity)
export const dynamicParams = true;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ place: string; byDate: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ place, byDate, category }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  // 🛡️ SECURITY: Validate place parameter
  const validation = validatePlaceForMetadata(place);
  if (!validation.isValid) {
    return validation.fallbackMetadata;
  }

  // Fetch categories for metadata generation FIRST
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await getCategories();
  } catch (error) {
    console.error("Error fetching categories for metadata:", error);
    categories = [];
  }

  // Convert searchParams to URLSearchParams for parsing
  const canonicalSearchParams = toUrlSearchParams(rawSearchParams);

  // Parse filters for metadata generation WITH categories
  const parsed = parseFiltersFromUrl(
    { place, date: byDate, category },
    canonicalSearchParams,
    categories // ✅ Now passing categories like in main function
  );
  const filters = urlToFilterState(parsed);

  // Find category name for SEO
  const categoryData = categories.find((cat) => cat.slug === filters.category);

  const placeTypeAndLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabelCached(
    filters.place
  );

  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: filters.place,
    byDate: filters.byDate as ByDateOptions,
    placeTypeLabel: placeTypeAndLabel,
    category: filters.category !== "tots" ? filters.category : undefined,
    categoryName: categoryData?.name,
  });

  return buildPageMeta({
    title: pageData.title,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
  });
}

export async function generateStaticParams() {
  // Generate static params for top combinations only
  // Other combinations will be generated on-demand with ISR

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

  // Pass validated places to getTopStaticCombinations
  const combinations = getTopStaticCombinations(
    undefined, // categories - use hardcoded fallback
    places.length > 0 ? places : undefined // places - validate if available
  );

  // Transform the returned format from { place, date, category } to { place, byDate, category }
  return combinations.map(({ place, date, category }) => ({
    place,
    byDate: date,
    category,
  }));
}

export default async function FilteredPage({
  params,
  searchParams,
}: {
  params: Promise<{ place: string; byDate: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ place, byDate, category }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  // 🛡️ SECURITY: Validate place parameter
  validatePlaceOrThrow(place);

  // Fetch dynamic categories BEFORE parsing URL to validate category slugs
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await getCategories();
  } catch (error) {
    // Continue without categories - will use static fallbacks
    console.error("Error fetching categories:", error);
    categories = []; // Fallback to empty array if fetch fails
  }

  // Convert searchParams to URLSearchParams for parsing
  const canonicalSearchParams = toUrlSearchParams(rawSearchParams);

  // Parse filters from URL with dynamic categories for validation
  const parsed = parseFiltersFromUrl(
    { place, date: byDate, category },
    canonicalSearchParams,
    categories
  );

  // Canonicalization note:
  // - Middleware handles structural normalization (folding query date/category, omitting "tots")
  // - This page-level redirect remains to validate category slugs against dynamic categories
  //   and normalize unknown slugs (middleware cannot fetch categories at edge time)
  // - When middleware already normalized, this is a no-op
  // - Query params (search, distance, lat, lon) are preserved through redirects
  const redirectUrl = getRedirectUrl(parsed);
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  // Convert to FilterState for compatibility
  const filters = urlToFilterState(parsed);

  // Prepare fetch params (align with byDate page behavior)
  const fetchParams: FetchEventsParams = {
    page: 0,
    size: 10,
    category: filters.category !== "tots" ? filters.category : undefined,
    // term is client-driven via SWR; omit on server to keep ISR static
  };

  // Only add place when not catalunya (API treats empty as full Catalonia)
  if (filters.place !== "catalunya") {
    fetchParams.place = filters.place;
  }

  // Use explicit date range for reliability across backends
  const dateRange = getDateRangeFromByDate(filters.byDate);
  if (dateRange) {
    fetchParams.from = toLocalDateString(dateRange.from);
    fetchParams.to = toLocalDateString(dateRange.until);
  }

  // Fetch events, place label, and news check in parallel
  const [placeTypeAndLabel, initialEventsResponse, hasNews] = await Promise.all(
    [
      getPlaceTypeAndLabelCached(filters.place),
      fetchEvents(fetchParams),
      hasNewsForPlace(filters.place),
    ]
  );
  let eventsResponse = initialEventsResponse;
  let events = eventsResponse?.content || [];
  let noEventsFound = false;

  // Check if we need to fetch fallback events from the region
  if (!events || events.length === 0) {
    const regionsWithCities = await fetchRegionsWithCities();
    const regionWithCities = regionsWithCities.find((r) =>
      r.cities.some((city) => city.value === filters.place)
    );

    if (regionWithCities) {
      const regions = await fetchRegions();
      const regionWithSlug = regions.find((r) => r.id === regionWithCities.id);

      if (regionWithSlug) {
        // Fetch events from the parent region (use explicit date range)
        const fallbackParams: FetchEventsParams = {
          page: 0,
          size: 7,
          place: regionWithSlug.slug,
        };
        const fallbackDateRange = getDateRangeFromByDate(filters.byDate);
        if (fallbackDateRange) {
          fallbackParams.from = toLocalDateString(fallbackDateRange.from);
          fallbackParams.to = toLocalDateString(fallbackDateRange.until);
        }
        // Intentionally DO NOT include category filter here.
        // Rationale: if a city has no events for a given category, the
        // regional fallback should surface any relevant events to help users
        // discover what's on nearby, rather than returning zero results again.

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

  // Find category name for SEO
  const categoryData = categories.find((cat) => cat.slug === filters.category);

  // Generate page data for SEO
  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: filters.place,
    byDate: filters.byDate as ByDateOptions,
    placeTypeLabel: placeTypeAndLabel,
    category: filters.category !== "tots" ? filters.category : undefined,
    categoryName: categoryData?.name,
  });

  // Generate JSON-LD structured data for events
  const validEvents = eventsWithAds.filter(isEventSummaryResponseDTO);
  const structuredData =
    validEvents.length > 0
      ? generateItemListStructuredData(
          validEvents,
          categoryData
            ? `${categoryData.name} ${filters.place}`
            : `Esdeveniments ${filters.place}`
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
          ? [
              {
                id: `events-${filters.place}-${filters.byDate}-${filters.category}`,
                data: structuredData,
              },
            ]
          : []),
      ]}
      initialEvents={eventsWithAds}
      pageData={pageData}
      placeTypeLabel={placeTypeAndLabel}
      place={filters.place}
      category={filters.category}
      date={filters.byDate}
      serverHasMore={!eventsResponse?.last}
      noEventsFound={noEventsFound}
      categories={categories}
      hasNews={hasNews}
    />
  );
}
