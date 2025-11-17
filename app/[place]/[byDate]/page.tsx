import { fetchEvents, insertAds, filterPastEvents } from "@lib/api/events";
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
import {
  twoWeeksDefault,
  getDateRangeFromByDate,
  isValidDateSlug,
} from "@lib/dates";
import { PlaceTypeAndLabel, ByDateOptions } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import { FetchEventsParams } from "types/event";
import { fetchRegionsWithCities, fetchRegions } from "@lib/api/regions";
import PlacePageShell from "@components/partials/PlacePageShell";
import {
  parseFiltersFromUrl,
  getRedirectUrl,
  toUrlSearchParams,
} from "@utils/url-filters";
import { buildFallbackUrlForInvalidPlace } from "@utils/url-filters";
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
import { DEFAULT_FILTER_VALUE } from "@utils/constants";

// page-level ISR not set here; fetch-level caching applies
export const revalidate = 300;
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
      actualCategory && actualCategory !== DEFAULT_FILTER_VALUE
        ? actualCategory
        : undefined,
    categoryName: categoryData?.name,
    search: parsed.queryParams.search,
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
    (date) => date !== DEFAULT_FILTER_VALUE
  ) as ByDateOptions[];

  // Get top categories from dynamic data (API is source of truth)
  // Validate categories exist in API to avoid generating pages for removed/renamed categories
  let topCategories: string[] = [];
  if (categories.length > 0) {
    // Use first 4 dynamic categories (same as getTopStaticCombinations)
    topCategories = categories.slice(0, 4).map((cat) => cat.slug);
  }
  // If no categories available, don't generate category pages (only place/date combinations)

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

  // Note: We don't do early place existence checks to avoid creating an enumeration oracle.
  // Invalid places will naturally result in empty event lists, which the page handles gracefully.

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
    } else if (!isValidDateSlug(byDate) && isValidCategorySlugFormat(byDate)) {
      // For two-segment URLs like /barcelona/teatre, byDate might actually be a category
      // Create a synthetic category to preserve user intent when categories API fails
      categories = [{ id: -1, name: byDate, slug: byDate }];
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

  if (finalCategory && finalCategory !== DEFAULT_FILTER_VALUE) {
    paramsForFetch.category = finalCategory;
  }

  // Intentionally do NOT apply querystring filters (search/distance/lat/lon) on the server.
  // These are handled client-side to keep ISR query-agnostic.

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

        if (finalCategory && finalCategory !== DEFAULT_FILTER_VALUE) {
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

  const filteredEvents = filterPastEvents(events);
  const eventsWithAds = insertAds(filteredEvents);

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
      finalCategory && finalCategory !== DEFAULT_FILTER_VALUE
        ? finalCategory
        : undefined,
    categoryName: categoryData?.name,
    search: parsed.queryParams.search,
  });

  const serverHasMore = eventsResponse ? !eventsResponse.last : false;

  const validEvents = eventsWithAds.filter(isEventSummaryResponseDTO);
  const structuredData =
    validEvents.length > 0
      ? generateItemListStructuredData(
          validEvents,
          finalCategory && finalCategory !== DEFAULT_FILTER_VALUE
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

  // Late existence check to preserve UX without creating an early oracle
  if (place !== "catalunya") {
    let placeExists: boolean | undefined;
    try {
      placeExists = (await fetchPlaceBySlug(place)) !== null;
    } catch {
      // ignore transient errors
    }
    if (placeExists === false) {
      const target = buildFallbackUrlForInvalidPlace({
        byDate,
        rawSearchParams: search,
      });
      redirect(target);
    }
  }

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
