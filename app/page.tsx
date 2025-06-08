import { fetchCategorizedEvents, fetchEvents } from "@lib/api/events";
import { generatePagesData } from "@components/partials/generatePagesData";
import { buildPageMeta } from "@components/partials/seo-meta";
import type { HomeInitialState, PageData, ByDateOptions } from "types/common";
import { FetchEventsParams } from "types/event";
import { EventSummaryResponseDTO, CategorizedEvents } from "types/api/event";
import ServerEventsDisplay from "@components/ui/serverEventsDisplay";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";
import HomeClient from "./HomeClient";

export async function generateMetadata() {
  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: "",
    byDate: "",
  });
  return buildPageMeta({
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
  });
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const search = await searchParams;

  // Extract query parameters for filters
  const category =
    typeof search.category === "string" ? search.category : undefined;
  const date = typeof search.date === "string" ? search.date : undefined;
  const distance =
    typeof search.distance === "string" ? search.distance : undefined;
  const searchTerm =
    typeof search.search === "string" ? search.search : undefined;

  console.log("🔥 Homepage - searchParams:", {
    category,
    date,
    distance,
    searchTerm,
  });

  // Check if any filters are present in URL
  const hasUrlFilters = Boolean(category || date || distance || searchTerm);

  // Fetch appropriate data based on whether filters are present
  let categorizedEvents: CategorizedEvents = {};
  let events: EventSummaryResponseDTO[] = [];
  let hasServerFilters = false;

  if (hasUrlFilters) {
    // When filters are present, fetch filtered events
    console.log("🔥 Homepage - Fetching filtered events due to URL filters");

    // Build filter parameters for API call
    const filterParams: FetchEventsParams = {
      page: 0,
      size: 50,
    };

    if (category) filterParams.category = category;
    if (date) filterParams.byDate = date as ByDateOptions;
    if (distance) filterParams.radius = parseInt(distance);
    if (searchTerm) filterParams.q = searchTerm;

    try {
      const eventsResponse = await fetchEvents(filterParams);
      events = eventsResponse.content || [];
      hasServerFilters = true;
      console.log("🔥 Homepage - Fetched filtered events:", events.length);
    } catch (error) {
      console.error("🔥 Homepage - Error fetching filtered events:", error);
      // Fallback to categorized events if filtering fails
      categorizedEvents = await fetchCategorizedEvents();
    }
  } else {
    // When no filters, fetch categorized events (normal homepage)
    console.log("🔥 Homepage - Fetching categorized events (no filters)");
    categorizedEvents = await fetchCategorizedEvents();
  }

  const initialState: HomeInitialState = {
    // Only initialize minimal state - events are handled server-side
    userLocation: null,
  };

  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: "",
    byDate: (date as ByDateOptions) || "",
  });

  return (
    <>
      {/* Initialize client store (for state management) */}
      <HomeClient
        initialState={initialState}
        urlFilters={{
          category,
          date,
          distance,
          searchTerm,
        }}
      />

      {/* Server-rendered events content (SEO optimized) */}
      {hasServerFilters ? (
        <ServerEventsDisplay
          events={events}
          hasServerFilters={hasServerFilters}
          pageData={pageData}
        />
      ) : (
        <ServerEventsDisplay
          categorizedEvents={categorizedEvents}
          pageData={pageData}
        />
      )}

      {/* Client-side interactive layer (search, filters, floating button) */}
      <ClientInteractiveLayer />
    </>
  );
}
