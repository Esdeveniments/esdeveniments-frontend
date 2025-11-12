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
import { distanceToRadius } from "types/event";
import PlacePageShell from "@components/partials/PlacePageShell";
import { parseFiltersFromUrl, urlToFilterState } from "@utils/url-filters";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { topStaticGenerationPlaces } from "@utils/priority-places";

export const revalidate = 600;
// Allow dynamic params not in generateStaticParams (default behavior, explicit for clarity)
export const dynamicParams = true;

export async function generateStaticParams() {
  // Only generate static pages for top ~15 places to keep build size under 230MB
  // Each place generates ~4.6MB, so 15 places = ~69MB (within limit)
  // Other places will be generated on-demand with ISR (revalidate: 600)
  // Runtime validation (validatePlaceOrThrow) handles invalid slugs gracefully
  return topStaticGenerationPlaces.map((slug) => ({ place: slug }));
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
}: {
  params: Promise<PlaceStaticPathParams>;
}) {
  const { place } = await params;

  validatePlaceOrThrow(place);

  // Fetch dynamic categories BEFORE parsing URL to validate category slugs
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    // Continue without categories - will use static fallbacks
    console.error("Error fetching categories:", error);
    categories = []; // Fallback to empty array if fetch fails
  }

  // Parse filters from path only (ignore searchParams on server to keep ISR)
  // Canonicalization of query params is handled in proxy.ts
  const parsed = parseFiltersFromUrl(
    { place },
    new URLSearchParams(),
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
  if (filters.lat && filters.lon) {
    const maybeRadius = distanceToRadius(filters.distance);
    if (maybeRadius !== undefined) {
      fetchParams.radius = maybeRadius;
    }
    fetchParams.lat = filters.lat;
    fetchParams.lon = filters.lon;
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
