import { fetchEvents, insertAds } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { fetchRegionsWithCities, fetchRegions } from "@lib/api/regions";
import { generatePagesData } from "@components/partials/generatePagesData";
import { hasNewsForPlace } from "@lib/api/news";
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
import { FetchEventsParams } from "types/event";
import PlacePageShell from "@components/partials/PlacePageShell";
import {
  parseFiltersFromUrl,
  urlToFilterState,
  toUrlSearchParams,
} from "@utils/url-filters";
import { applyDistanceToParams } from "@utils/api-helpers";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { topStaticGenerationPlaces } from "@utils/priority-places";
import { fetchPlaces, fetchPlaceBySlug } from "@lib/api/places";
import { notFound } from "next/navigation";

export const revalidate = 600;
// Allow dynamic params not in generateStaticParams (default behavior, explicit for clarity)
export const dynamicParams = true;

export async function generateStaticParams() {
  // Only generate static pages for top ~15 places to keep build size under 230MB
  // Each place generates ~4.6MB, so 15 places = ~69MB (within limit)
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
    return topStaticGenerationPlaces.map((slug) => ({ place: slug }));
  }

  // Filter to only places that exist in API
  const placeSlugs = new Set(places.map((p) => p.slug));
  const validPlaces = topStaticGenerationPlaces.filter((slug) =>
    placeSlugs.has(slug)
  );

  return validPlaces.map((slug) => ({ place: slug }));
}

export async function generateMetadata({
  params,
  searchParams: _searchParams,
}: {
  params: Promise<PlaceStaticPathParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { place } = await params;

  const validation = validatePlaceForMetadata(place);
  if (!validation.isValid) {
    return validation.fallbackMetadata;
  }

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabelCached(
    place
  );
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ place }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  validatePlaceOrThrow(place);

  // 🛡️ SECURITY: Early place existence check to prevent DoS via arbitrary slug enumeration
  // This validates the place exists in the API before any expensive operations
  // Special case: "catalunya" is always valid (homepage equivalent)
  if (place !== "catalunya") {
    try {
      const placeExists = await fetchPlaceBySlug(place);
      if (!placeExists) {
        // Place definitively doesn't exist (404) - show not found
        notFound();
      }
    } catch (error) {
      // Transient errors (500, network failures, etc.) - log but continue
      // The page will handle gracefully, and the error might be transient
      console.error(
        `Error checking place existence for ${place}, continuing anyway:`,
        error
      );
    }
  }

  // Fetch dynamic categories BEFORE parsing URL to validate category slugs
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    // Continue without categories - will use static fallbacks
    console.error("Error fetching categories:", error);
    categories = []; // Fallback to empty array if fetch fails
  }

  // Convert searchParams to URLSearchParams for parsing
  const canonicalSearchParams = toUrlSearchParams(rawSearchParams);

  // Preserve user-requested category if categories API failed
  if (categories.length === 0) {
    const fallbackSlug = canonicalSearchParams.get("category");
    if (fallbackSlug && /^[a-z0-9-]{1,64}$/.test(fallbackSlug)) {
      categories = [{ id: -1, name: fallbackSlug, slug: fallbackSlug }];
    }
  }

  // Parse filters from URL with searchParams preserved
  // Canonicalization of query params is handled in proxy.ts
  const parsed = parseFiltersFromUrl(
    { place },
    canonicalSearchParams,
    categories
  );

  // Convert to FilterState for compatibility
  const filters = urlToFilterState(parsed);

  const category = filters.category !== "tots" ? filters.category : undefined;
  const date = filters.byDate !== "tots" ? filters.byDate : undefined;
  const query = filters.searchTerm || undefined;

  const fetchParams: FetchEventsParams = {
    page: 0,
    size: 10,
  };

  if (place !== "catalunya") {
    fetchParams.place = place;
  }

  if (category) fetchParams.category = category;

  // Add distance/radius filter if coordinates are provided
  applyDistanceToParams(fetchParams, {
    lat: filters.lat,
    lon: filters.lon,
    distance: filters.distance,
  });

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

  // Check news (categories already fetched above)
  const hasNews = await hasNewsForPlace(place);

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabelCached(
    place
  );

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
    <PlacePageShell
      scripts={
        structuredData ? [{ id: `events-${place}`, data: structuredData }] : []
      }
      initialEvents={eventsWithAds}
      placeTypeLabel={placeTypeLabel}
      pageData={pageData}
      noEventsFound={noEventsFound}
      place={place}
      category={category}
      date={date}
      serverHasMore={!eventsResponse?.last}
      categories={categories}
      hasNews={hasNews}
    />
  );
}
