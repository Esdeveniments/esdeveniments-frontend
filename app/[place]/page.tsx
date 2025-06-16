import { redirect } from "next/navigation";
import { fetchEvents, insertAds } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import { fetchRegionsWithCities, fetchRegions } from "@lib/api/regions";
import { generatePagesData } from "@components/partials/generatePagesData";
import { buildPageMeta } from "@components/partials/seo-meta";
import type {
  PlaceStaticPathParams,
  PlaceTypeAndLabel,
  PageData,
} from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import type { EventCategory } from "@store";
import { FetchEventsParams } from "types/event";
import ServerEventsDisplay from "@components/ui/serverEventsDisplay";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";
import { buildCanonicalUrl } from "@utils/url-filters";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
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

  // 🛡️ SECURITY: Validate place parameter
  const validation = validatePlaceForMetadata(place);
  if (!validation.isValid) {
    return validation.fallbackMetadata;
  }

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

  // 🛡️ SECURITY: Validate place parameter
  validatePlaceOrThrow(place);

  // Convert searchParams to URLSearchParams for parsing
  const urlSearchParams = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (typeof value === "string") {
      urlSearchParams.set(key, value);
    } else if (Array.isArray(value)) {
      urlSearchParams.set(key, value[0]);
    }
  });

  // Check if we have filters that should redirect to canonical URL structure
  const category =
    typeof search.category === "string" ? search.category : undefined;
  const date = typeof search.date === "string" ? search.date : undefined;
  const distance =
    typeof search.distance === "string" ? search.distance : undefined;
  const searchTerm =
    typeof search.search === "string" ? search.search : undefined;

  // If we have category or date filters, redirect to canonical URL structure
  if (category || date) {
    const canonicalUrl = buildCanonicalUrl({
      place,
      byDate: date || "tots",
      category: (category as EventCategory) || "tots",
      searchTerm: searchTerm || "",
      distance: distance ? parseInt(distance) : 50,
    });

    console.log(`🔄 Redirecting /${place}?... → ${canonicalUrl}`);
    redirect(canonicalUrl);
  }

  const fetchParams: FetchEventsParams = {
    page: 0,
    size: 10,
  };

  // Only add zone if place is not "catalunya" (catalunya is not a valid API zone)
  if (place !== "catalunya") {
    fetchParams.zone = place;
  }

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
    const regionsWithCities = await fetchRegionsWithCities();
    const regionWithCities = regionsWithCities.find((r) =>
      r.cities.some((city) => city.value === place)
    );

    if (regionWithCities) {
      // Get the region with slug from the regions API
      const regions = await fetchRegions();
      const regionWithSlug = regions.find((r) => r.id === regionWithCities.id);
      
      if (regionWithSlug) {
        eventsResponse = await fetchEvents({
          page: 0,
          size: 7,
          zone: regionWithSlug.slug,
        });
        totalServerEvents = eventsResponse?.totalElements || 0;
        noEventsFound = true;
      }
    }
  }

  const events = eventsResponse?.content || [];
  const eventsWithAds = insertAds(events);

  // Fetch dynamic categories for enhanced category support
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
    console.log("🔥 [place]/page.tsx - Fetched categories:", categories.length);
  } catch (error) {
    console.error("🔥 [place]/page.tsx - Error fetching categories:", error);
    // Continue without categories - components will use static fallbacks
  }

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabel(place);

  const pageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place,
    byDate: "",
    placeTypeLabel,
  });

  return (
    <>
      {/* Initialize client hydration only */}
      <PlaceClient />

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
        categories={categories}
      />

      {/* Client-side interactive layer (search, filters, floating button) */}
      <ClientInteractiveLayer
        categories={categories}
        placeTypeLabel={placeTypeLabel}
      />
    </>
  );
}
