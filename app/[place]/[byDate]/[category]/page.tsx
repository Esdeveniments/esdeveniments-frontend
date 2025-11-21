import { insertAds, filterPastEvents } from "@lib/api/events";
import { getCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { hasNewsForPlace } from "@lib/api/news";
import { generatePagesData } from "@components/partials/generatePagesData";
import {
  buildPageMeta,
  generateItemListStructuredData,
  generateWebPageSchema,
  generateCollectionPageSchema,
} from "@components/partials/seo-meta";
import type {
  PlaceTypeAndLabel,
  PageData,
  ByDateOptions,
  JsonLdScript,
} from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import { FetchEventsParams } from "types/event";
import PlacePageShell from "@components/partials/PlacePageShell";
import {
  parseFiltersFromUrl,
  urlToFilterState,
  getTopStaticCombinations,
  getRedirectUrl,
  toUrlSearchParams,
} from "@utils/url-filters";
import { buildFallbackUrlForInvalidPlace } from "@utils/url-filters";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { fetchEventsWithFallback } from "@lib/helpers/event-fallback";
import { siteUrl } from "@config/index";
import { fetchPlaces, fetchPlaceBySlug } from "@lib/api/places";
import { toLocalDateString } from "@utils/helpers";
import { twoWeeksDefault, getDateRangeFromByDate } from "@lib/dates";
import { redirect } from "next/navigation";
import { isValidCategorySlugFormat } from "@utils/category-mapping";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";
import type { PlacePageEventsResult } from "types/props";

export const revalidate = 300;
// Allow dynamic params not in generateStaticParams (default behavior, explicit for clarity)
export const dynamicParams = true;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ place: string; byDate: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ place, byDate, category }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  // 🛡️ SECURITY: Validate place parameter
  const validation = validatePlaceForMetadata(place);
  if (!validation.isValid) {
    return validation.fallbackMetadata;
  }

  // Fetch categories for metadata generation FIRST
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await getCategories();
  } catch (error) {
    console.error("Error fetching categories for metadata:", error);
    categories = [];
  }

  // Convert searchParams to URLSearchParams for parsing
  const canonicalSearchParams = toUrlSearchParams(rawSearchParams);

  // Preserve user-requested category from path if categories API fails
  if (
    categories.length === 0 &&
    category &&
    isValidCategorySlugFormat(category)
  ) {
    categories = [{ id: -1, name: category, slug: category }];
  }

  // Parse filters for metadata generation WITH categories
  const parsed = parseFiltersFromUrl(
    { place, date: byDate, category },
    canonicalSearchParams,
    categories // ✅ Now passing categories like in main function
  );
  const filters = urlToFilterState(parsed);

  // Find category name for SEO
  const categoryData = categories.find((cat) => cat.slug === filters.category);

  const placeTypeAndLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabelCached(
    filters.place
  );

  const pageData: PageData = await generatePagesData({
    currentYear: new Date().getFullYear(),
    place: filters.place,
    byDate: filters.byDate as ByDateOptions,
    placeTypeLabel: placeTypeAndLabel,
    category:
      filters.category !== DEFAULT_FILTER_VALUE ? filters.category : undefined,
    categoryName: categoryData?.name,
    search: parsed.queryParams.search,
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

  // Pass validated places to getTopStaticCombinations
  const combinations = getTopStaticCombinations(
    undefined, // categories - use hardcoded fallback
    places.length > 0 ? places : undefined // places - validate if available
  );

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
}: {
  params: Promise<{ place: string; byDate: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ place, byDate, category }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  // 🛡️ SECURITY: Validate place parameter
  validatePlaceOrThrow(place);

  // Note: We don't do early place existence checks to avoid creating an enumeration oracle.
  // Invalid places will naturally result in empty event lists, which the page handles gracefully.

  // Fetch dynamic categories BEFORE parsing URL to validate category slugs
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await getCategories();
  } catch (error) {
    // Continue without categories - will use static fallbacks
    console.error("Error fetching categories:", error);
    categories = []; // Fallback to empty array if fetch fails
  }

  // Convert searchParams to URLSearchParams for parsing
  const canonicalSearchParams = toUrlSearchParams(rawSearchParams);

  // Preserve user-requested category from path if categories API fails
  if (
    categories.length === 0 &&
    category &&
    isValidCategorySlugFormat(category)
  ) {
    categories = [{ id: -1, name: category, slug: category }];
  }

  // Parse filters from URL with dynamic categories for validation
  const parsed = parseFiltersFromUrl(
    { place, date: byDate, category },
    canonicalSearchParams,
    categories
  );

  // Canonicalization note:
  // - Middleware handles structural normalization (folding query date/category, omitting "tots")
  // - This page-level redirect remains to validate category slugs against dynamic categories
  //   and normalize unknown slugs (middleware cannot fetch categories at edge time)
  // - When middleware already normalized, this is a no-op
  // - Query params (search, distance, lat, lon) are preserved through redirects
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
    category:
      filters.category !== DEFAULT_FILTER_VALUE ? filters.category : undefined,
    // term is client-driven via SWR; omit on server to keep ISR static
  };

  // Only add place when not catalunya (API treats empty as full Catalonia)
  if (filters.place !== "catalunya") {
    fetchParams.place = filters.place;
  }

  // Use explicit date range for reliability across backends
  const dateRange = getDateRangeFromByDate(filters.byDate);
  if (dateRange) {
    fetchParams.from = toLocalDateString(dateRange.from);
    fetchParams.to = toLocalDateString(dateRange.until);
  }

  // Intentionally do NOT apply querystring filters (search/distance/lat/lon) on the server.
  // These are handled client-side to keep ISR query-agnostic.

  const categoryData = categories.find((cat) => cat.slug === filters.category);

  // Fetch shell data parallel to events/news
  const placeShellDataPromise = (async () => {
    try {
      const placeTypeLabel: PlaceTypeAndLabel =
        await getPlaceTypeAndLabelCached(filters.place);
      const pageData: PageData = await generatePagesData({
        currentYear: new Date().getFullYear(),
        place: filters.place,
        byDate: filters.byDate as ByDateOptions,
        placeTypeLabel,
        category:
          filters.category !== DEFAULT_FILTER_VALUE
            ? filters.category
            : undefined,
        categoryName: categoryData?.name,
        search: parsed.queryParams.search,
      });
      return { placeTypeLabel, pageData };
    } catch (error) {
      console.error(
        "Place by date/category page: unable to build shell data",
        error
      );
      return buildFallbackCategoryShellData({
        place: filters.place,
        byDate: filters.byDate,
        category: filters.category,
        categoryName: categoryData?.name,
      });
    }
  })();

  const eventsPromise = buildCategoryEventsPromise({
    filters,
    fetchParams,
    pageDataPromise: placeShellDataPromise.then((data) => data.pageData),
    categoryName: categoryData?.name,
  });

  const hasNewsPromise = hasNewsForPlace(filters.place).catch((error) => {
    console.error("Error checking news availability:", error);
    return false;
  });

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
        category,
        rawSearchParams: rawSearchParams,
      });
      redirect(target);
    }
  }

  return (
    <PlacePageShell
      eventsPromise={eventsPromise}
      shellDataPromise={placeShellDataPromise}
      place={filters.place}
      category={filters.category}
      date={filters.byDate}
      categories={categories}
      hasNewsPromise={hasNewsPromise}
      webPageSchemaFactory={(pageData) =>
        generateWebPageSchema({
          title: pageData.title,
          description: pageData.metaDescription,
          url: pageData.canonical,
        })
      }
    />
  );
}

function buildFallbackCategoryShellData({
  place,
  byDate,
  category,
  categoryName,
}: {
  place: string;
  byDate: string;
  category: string;
  categoryName?: string;
}): { placeTypeLabel: PlaceTypeAndLabel; pageData: PageData } {
  const placeTypeLabel: PlaceTypeAndLabel = { type: "", label: place };
  const hasSpecificDate =
    byDate && byDate !== DEFAULT_FILTER_VALUE && byDate !== "";
  const dateLabel = hasSpecificDate ? byDate : "els propers dies";
  const categoryLabel =
    category && category !== DEFAULT_FILTER_VALUE
      ? categoryName || category
      : "";
  const canonicalSegments = [place];
  if (hasSpecificDate) {
    canonicalSegments.push(byDate);
  }
  if (category && category !== DEFAULT_FILTER_VALUE) {
    canonicalSegments.push(category);
  }
  const canonicalPath = `/${canonicalSegments.join("/")}`;
  const canonical = `${siteUrl}${canonicalPath}`;
  const title = `${
    categoryLabel || "Esdeveniments"
  } ${dateLabel} a ${place}`;
  const subTitle = `Descobreix ${
    categoryLabel ? `plans de ${categoryLabel}` : "plans"
  } ${hasSpecificDate ? `per ${byDate}` : "per als propers dies"} a ${place}.`;

  return {
    placeTypeLabel,
    pageData: {
      title,
      subTitle,
      metaTitle: `${title} | Esdeveniments.cat`,
      metaDescription: `Explora ${
        categoryLabel ? `propostes de ${categoryLabel}` : "plans"
      } ${hasSpecificDate ? `per ${byDate}` : "per als propers dins"} a ${place}.`,
      canonical,
      notFoundTitle: "Sense esdeveniments disponibles",
      notFoundDescription: `No hem trobat ${
        categoryLabel ? `activitats de ${categoryLabel}` : "activitats"
      } ${
        hasSpecificDate ? `per ${byDate}` : "per als propers dies"
      } a ${place}.`,
    },
  };
}

async function buildCategoryEventsPromise({
  filters,
  fetchParams,
  pageDataPromise,
  categoryName,
}: {
  filters: { place: string; byDate: string; category: string };
  fetchParams: FetchEventsParams;
  pageDataPromise: Promise<PageData>;
  categoryName?: string;
}): Promise<PlacePageEventsResult> {
  const { eventsResponse, events, noEventsFound } =
    await fetchEventsWithFallback({
      place: filters.place,
      initialParams: fetchParams,
      regionFallback: {
        size: 7,
        includeDateRange: true,
        dateRangeFactory: twoWeeksDefault,
      },
      finalFallback: {
        size: 7,
        includeCategory: false,
        includeDateRange: true,
        dateRangeFactory: twoWeeksDefault,
        place: undefined,
      },
    });
  const serverHasMore = eventsResponse ? !eventsResponse.last : false;

  const filteredEvents = filterPastEvents(events);

  // Align noEventsFound logic with other pages
  let finalNoEventsFound = noEventsFound;
  if (events.length > 0 && filteredEvents.length === 0 && !finalNoEventsFound) {
    finalNoEventsFound = true;
  }

  const eventsWithAds = insertAds(filteredEvents);
  const validEvents = eventsWithAds.filter(isEventSummaryResponseDTO);
  const pageData = await pageDataPromise;
  const structuredScripts: JsonLdScript[] = [];

  if (validEvents.length > 0) {
    const label = categoryName
      ? `${categoryName} ${filters.place}`
      : `Esdeveniments ${filters.place}`;

    structuredScripts.push({
      id: `events-${filters.place}-${filters.byDate}-${filters.category}`,
      data: generateItemListStructuredData(validEvents, label),
    });

    const collectionSchema = generateCollectionPageSchema({
      title: pageData.title,
      description: pageData.metaDescription,
      url: pageData.canonical,
      numberOfItems: validEvents.length,
    });

    if (collectionSchema) {
      structuredScripts.push({
        id: `collection-${filters.place}-${filters.byDate}-${filters.category}`,
        data: collectionSchema,
      });
    }
  }

  return {
    events: eventsWithAds,
    noEventsFound: finalNoEventsFound,
    serverHasMore,
    structuredScripts: structuredScripts.length
      ? structuredScripts
      : undefined,
  };
}
