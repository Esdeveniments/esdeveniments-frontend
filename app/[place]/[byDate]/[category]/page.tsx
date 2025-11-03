import { redirect } from "next/navigation";
import Script from "next/script";
import { headers } from "next/headers";
import { fetchEvents, insertAds } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabel } from "@utils/helpers";
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
import { FilteredPageProps } from "types/props";
import { distanceToRadius } from "types/event";
import PlacePageShell from "@components/partials/PlacePageShell";
import {
  parseFiltersFromUrl,
  getRedirectUrl,
  urlToFilterState,
  getTopStaticCombinations,
} from "@utils/url-filters";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { fetchRegionsWithCities, fetchRegions } from "@lib/api/regions";
import { toLocalDateString } from "@utils/helpers";
import { today, tomorrow, week, weekend, twoWeeksDefault } from "@lib/dates";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string; byDate: string; category: string }>;
}) {
  const { place, byDate, category } = await params;

  // 🛡️ SECURITY: Validate place parameter
  const validation = validatePlaceForMetadata(place);
  if (!validation.isValid) {
    return validation.fallbackMetadata;
  }

  // Fetch categories for metadata generation FIRST
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    console.error("Error fetching categories for metadata:", error);
    categories = [];
  }

  // Parse filters for metadata generation WITH categories
  const parsed = parseFiltersFromUrl(
    { place, date: byDate, category },
    new URLSearchParams(),
    categories // ✅ Now passing categories like in main function
  );
  const filters = urlToFilterState(parsed);

  // Find category name for SEO
  const categoryData = categories.find((cat) => cat.slug === filters.category);

  const placeTypeAndLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabel(
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
  const combinations = getTopStaticCombinations();

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
}: FilteredPageProps) {
  const { place, byDate, category } = await params;
  const search = await searchParams;

  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

  // 🛡️ SECURITY: Validate place parameter
  validatePlaceOrThrow(place);

  // Convert searchParams to URLSearchParams
  const urlSearchParams = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (typeof value === "string") {
      urlSearchParams.set(key, value);
    } else if (Array.isArray(value)) {
      urlSearchParams.set(key, value[0]);
    }
  });

  // Fetch dynamic categories BEFORE parsing URL to validate category slugs
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    // Continue without categories - will use static fallbacks
    console.error("Error fetching categories:", error);
    categories = []; // Fallback to empty array if fetch fails
  }

  // Parse filters from URL with dynamic categories for validation
  const parsed = parseFiltersFromUrl(
    { place, date: byDate, category },
    urlSearchParams,
    categories
  );

  // Check if redirect is needed for non-canonical URLs
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
    term: filters.searchTerm || undefined,
  };

  // Only add place when not catalunya (API treats empty as full Catalonia)
  if (filters.place !== "catalunya") {
    fetchParams.place = filters.place;
  }

  // Use explicit date range for reliability across backends
  if (filters.byDate !== "tots") {
    const map: Record<string, () => { from: Date; until: Date }> = {
      avui: today,
      dema: tomorrow,
      setmana: week,
      "cap-de-setmana": weekend,
    };
    const fn = map[filters.byDate] || today;
    const { from, until } = fn();
    fetchParams.from = toLocalDateString(from);
    fetchParams.to = toLocalDateString(until);
  }

  // Add distance/radius filter if coordinates are provided
  if (filters.lat && filters.lon) {
    const maybeRadius = distanceToRadius(filters.distance);
    if (maybeRadius !== undefined) {
      fetchParams.radius = maybeRadius;
    }
    fetchParams.lat = filters.lat;
    fetchParams.lon = filters.lon;
  }

  // Fetch events and place label in parallel
  const [placeTypeAndLabel, initialEventsResponse] = await Promise.all([
    getPlaceTypeAndLabel(filters.place),
    fetchEvents(fetchParams),
  ]);
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
        if (filters.byDate !== "tots") {
          const map: Record<string, () => { from: Date; until: Date }> = {
            avui: today,
            dema: tomorrow,
            setmana: week,
            "cap-de-setmana": weekend,
          };
          const fn = map[filters.byDate] || today;
          const { from, until } = fn();
          fallbackParams.from = toLocalDateString(from);
          fallbackParams.to = toLocalDateString(until);
        }
        // Keep category constraint if present for consistency with other routes
        if (filters.category && filters.category !== "tots") {
          fallbackParams.category = filters.category;
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
      nonce={nonce}
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
    />
  );
}
