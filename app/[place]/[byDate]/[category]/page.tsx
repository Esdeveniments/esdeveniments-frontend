import { redirect } from "next/navigation";
import { fetchEvents, insertAds } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import { generatePagesData } from "@components/partials/generatePagesData";
import { buildPageMeta } from "@components/partials/seo-meta";
import type { PlaceTypeAndLabel, PageData, ByDateOptions } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import { FetchEventsParams } from "types/event";
import { FilteredPageProps } from "types/props";
import ServerEventsDisplay from "@components/ui/serverEventsDisplay";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";
import PlaceClient from "../../PlaceClient";
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

  console.log("🔍 Categories fetched successfully:");

  // Parse filters for metadata generation
  const parsed = parseFiltersFromUrl(
    { place, date: byDate, category },
    new URLSearchParams()
  );
  const filters = urlToFilterState(parsed);

  const placeTypeAndLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabel(
    filters.place
  );
  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: filters.place,
    byDate: filters.byDate as ByDateOptions,
    placeTypeLabel: placeTypeAndLabel,
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

  // Get place type and label
  const placeTypeAndLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabel(
    filters.place
  );

  // Prepare fetch params
  const fetchParams: FetchEventsParams = {
    place: filters.place,
    byDate: filters.byDate as ByDateOptions,
    isToday: filters.byDate === "tots",
    category: filters.category !== "tots" ? filters.category : undefined,
    searchTerm: filters.searchTerm || undefined,
    distance: filters.distance !== 50 ? filters.distance : undefined,
  };

  // Fetch events
  const events = await fetchEvents(fetchParams);
  const eventsWithAds = insertAds(events.content);
  const totalServerEvents = events?.totalElements || 0;

  // Generate page data for SEO
  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: filters.place,
    byDate: filters.byDate as ByDateOptions,
    placeTypeLabel: placeTypeAndLabel,
  });

  return (
    <>
      {/* Initialize client hydration only */}
      <PlaceClient />

      <ServerEventsDisplay
        events={eventsWithAds}
        pageData={pageData}
        placeTypeLabel={placeTypeAndLabel}
        hasServerFilters={true}
        place={filters.place}
        category={filters.category}
        date={filters.byDate}
        totalServerEvents={totalServerEvents}
        categories={categories}
      />
      <ClientInteractiveLayer categories={categories} />
    </>
  );
}
