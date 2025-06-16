import { fetchCategorizedEvents, fetchEvents } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { generatePagesData } from "@components/partials/generatePagesData";
import { buildPageMeta } from "@components/partials/seo-meta";
import type { PageData, ByDateOptions } from "types/common";
import { FetchEventsParams } from "types/event";
import { EventSummaryResponseDTO, CategorizedEvents } from "types/api/event";
import type { CategorySummaryResponseDTO } from "types/api/category";
import ServerEventsDisplay from "@components/ui/serverEventsDisplay";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";

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

  // Check if any filters are present in URL
  const hasUrlFilters = Boolean(category || date || distance || searchTerm);

  // Fetch dynamic categories for enhanced category support
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    // Continue without categories - components will use static fallbacks
    console.error("Error fetching categories:", error);
    categories = [];
  }

  // Fetch appropriate data based on whether filters are present
  let categorizedEvents: CategorizedEvents = {};
  let events: EventSummaryResponseDTO[] = [];
  let hasServerFilters = false;

  if (hasUrlFilters) {
    // When filters are present, fetch filtered events

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
    } catch (error) {
      // Fallback to categorized events if filtering fails
      console.error("Error fetching filtered events:", error);
      events = [];
      hasServerFilters = false;
      // Fetch categorized events as fallback
      console.warn("Falling back to categorized events due to error.");
      // This ensures we still have something to display
      categorizedEvents = await fetchCategorizedEvents();
    }
  } else {
    // When no filters, fetch categorized events (normal homepage)
    categorizedEvents = await fetchCategorizedEvents();
  }

  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: "",
    byDate: (date as ByDateOptions) || "",
  });

  return (
    <>
      {/* Server-rendered events content (SEO optimized) */}
      {hasServerFilters ? (
        <ServerEventsDisplay
          events={events}
          hasServerFilters={hasServerFilters}
          pageData={pageData}
          categories={categories}
        />
      ) : (
        <ServerEventsDisplay
          categorizedEvents={categorizedEvents}
          pageData={pageData}
          categories={categories}
        />
      )}

      {/* Client-side interactive layer (search, filters, floating button) */}
      <ClientInteractiveLayer categories={categories} />
    </>
  );
}
