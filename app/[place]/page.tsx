import { fetchEvents, insertAds } from "@lib/api/events";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import { fetchRegionsWithCities } from "@lib/api/regions";
import { generatePagesData } from "@components/partials/generatePagesData";
import { buildPageMeta } from "@components/partials/seo-meta";
import type {
  PlaceStaticPathParams,
  PlaceTypeAndLabel,
  PageData,
} from "types/common";
import type { EventCategory } from "@store";
// Removed twoWeeksDefault - no longer needed with new API structure
import { FetchEventsParams } from "types/event";
import ServerEventsDisplay from "@components/ui/serverEventsDisplay";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";
import PlaceClient from "./PlaceClient";

export const revalidate = 600;

export async function generateStaticParams() {
  const regions = await fetchRegionsWithCities();
  const params = [];
  for (const region of regions) {
    params.push({ place: region.name });
    if (region.cities) {
      for (const city of region.cities) {
        params.push({ place: city.value });
      }
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PlaceStaticPathParams>;
}) {
  const { place } = await params;
  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabel(place);
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
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { place } = await params;
  const search = await searchParams;

  // Extract query parameters for filters
  const category =
    typeof search.category === "string" ? search.category : undefined;
  const date = typeof search.date === "string" ? search.date : undefined;
  const distance =
    typeof search.distance === "string" ? search.distance : undefined;

  const fetchParams: FetchEventsParams = {
    page: 0,
    size: 10,
    zone: place,
  };

  // Add filters if present
  if (category) fetchParams.category = category;

  console.log("🔥 [place]/page.tsx - fetchParams:", fetchParams);
  console.log("🔥 [place]/page.tsx - searchParams:", {
    category,
    date,
    distance,
  });

  let eventsResponse = await fetchEvents(fetchParams);
  let noEventsFound = false;
  let totalServerEvents = eventsResponse?.totalElements || 0;

  if (
    !eventsResponse ||
    !eventsResponse.content ||
    eventsResponse.content.length === 0
  ) {
    const regions = await fetchRegionsWithCities();
    const region = regions.find((r) =>
      r.cities.some((city) => city.value === place)
    );

    if (region) {
      eventsResponse = await fetchEvents({
        page: 0,
        size: 7,
        zone: region.name,
      });
      totalServerEvents = eventsResponse?.totalElements || 0;
      noEventsFound = true;
    }
  }

  const events = eventsResponse?.content || [];
  const eventsWithAds = insertAds(events);

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabel(place);

  const pageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place,
    byDate: "",
    placeTypeLabel,
  });

  const initialState = {
    // Only initialize filter state - events are handled server-side
    place,
    byDate: date || "",
    category: (category || "") as EventCategory | "",
  };

  return (
    <>
      {/* Initialize client store (for state management) */}
      <PlaceClient
        initialState={initialState}
        placeTypeLabel={placeTypeLabel}
        pageData={pageData}
      />

      {/* Server-rendered events content (SEO optimized) */}
      <ServerEventsDisplay
        events={eventsWithAds}
        placeTypeLabel={placeTypeLabel}
        pageData={pageData}
        noEventsFound={noEventsFound}
        hasServerFilters={true}
        place={place}
        category={category}
        date={date}
        totalServerEvents={totalServerEvents}
      />

      {/* Client-side interactive layer (search, filters, floating button) */}
      <ClientInteractiveLayer />
    </>
  );
}
