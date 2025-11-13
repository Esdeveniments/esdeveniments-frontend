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
import { buildFallbackUrlForInvalidPlace } from "@utils/url-filters";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { fetchPlaceBySlug } from "@lib/api/places";
import { redirect } from "next/navigation";
import { topStaticGenerationPlaces } from "@utils/priority-places";

export const revalidate = 600;
// Allow dynamic params not in generateStaticParams (default behavior, explicit for clarity)
export const dynamicParams = true;
// Note: This page is ISR-compatible. Server renders canonical, query-agnostic HTML.
// All query filters (search, distance, lat, lon) are handled client-side.

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

  // Note: We don't do early place existence checks to avoid creating an enumeration oracle.
  // Invalid places will naturally result in empty event lists, which the page handles gracefully.

  // Fetch dynamic categories for metadata and client-side filtering
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    // Continue without categories - will use static fallbacks
    console.error("Error fetching categories:", error);
    categories = []; // Fallback to empty array if fetch fails
  }

  // Server-side fetch: canonical, query-agnostic (no search, distance, lat, lon)
  // All query filters are handled client-side via HybridEventsListClient
  const fetchParams: FetchEventsParams = {
    page: 0,
    size: 10,
  };

  if (place !== "catalunya") {
    fetchParams.place = place;
  }

  // Note: category, search, distance, lat, lon filters are NOT applied server-side
  // to keep this route ISR-compatible. They are handled client-side.

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
        rawSearchParams: {},
      });
      redirect(target);
    }
  }

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
      category={undefined}
      date={undefined}
      serverHasMore={!eventsResponse?.last}
      categories={categories}
      hasNews={hasNews}
    />
  );
}
