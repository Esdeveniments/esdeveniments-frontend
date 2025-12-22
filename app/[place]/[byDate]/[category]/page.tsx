import { insertAds } from "@lib/api/events";
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
import { getTranslations } from "next-intl/server";
import { redirect, notFound } from "next/navigation";
import { getLocaleSafely } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";
import { isValidCategorySlugFormat } from "@utils/category-mapping";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";
import type { PlacePageEventsResult } from "types/props";
import { addLocalizedDateFields } from "@utils/mappers/event";

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
    place: filters.place,
    byDate: filters.byDate as ByDateOptions,
    placeTypeLabel: placeTypeAndLabel,
    category:
      filters.category !== DEFAULT_FILTER_VALUE ? filters.category : undefined,
    categoryName: categoryData?.name,
    search: parsed.queryParams.search,
  });
  const locale = await getLocaleSafely();

  return buildPageMeta({
    title: pageData.title,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
    locale,
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
  const locale: AppLocale = await getLocaleSafely();
  const tFallback = await getTranslations({
    locale,
    namespace: "App.PlaceByDateCategory",
  });

  try {
    validatePlaceOrThrow(place);
  } catch {
    notFound();
  }

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
        t: tFallback,
      });
    }
  })();

  const eventsPromise = buildCategoryEventsPromise({
    filters,
    fetchParams,
    pageDataPromise: placeShellDataPromise.then((data) => data.pageData),
    categoryName: categoryData?.name,
    locale,
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
          locale,
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
  t,
}: {
  place: string;
  byDate: string;
  category: string;
  categoryName?: string;
  t: (key: string, values?: Record<string, string>) => string;
}): { placeTypeLabel: PlaceTypeAndLabel; pageData: PageData } {
  const placeTypeLabel: PlaceTypeAndLabel = { type: "", label: place };
  const hasSpecificDate =
    byDate && byDate !== DEFAULT_FILTER_VALUE && byDate !== "";
  const dateLabel = hasSpecificDate ? byDate : t("dateFallback");
  const categoryLabel =
    category && category !== DEFAULT_FILTER_VALUE
      ? categoryName || category
      : "";
  const titleCategoryLabel = categoryLabel || t("categoryFallback");
  const plansLabel = categoryLabel
    ? t("plansWithCategory", { categoryLabel })
    : t("plansFallback");
  const proposalsLabel = categoryLabel
    ? t("proposalsWithCategory", { categoryLabel })
    : t("proposalsFallback");
  const activitiesLabel = categoryLabel
    ? t("activitiesWithCategory", { categoryLabel })
    : t("activitiesFallback");
  const canonicalSegments = [place];
  if (hasSpecificDate) {
    canonicalSegments.push(byDate);
  }
  if (category && category !== DEFAULT_FILTER_VALUE) {
    canonicalSegments.push(category);
  }
  const canonicalPath = `/${canonicalSegments.join("/")}`;
  const canonical = `${siteUrl}${canonicalPath}`;
  const title = t("title", { categoryLabel: titleCategoryLabel, dateLabel, place });
  const subTitle = hasSpecificDate
    ? t("subtitleWithDate", { plansLabel, date: byDate, place })
    : t("subtitleFallback", { plansLabel, place });

  return {
    placeTypeLabel,
    pageData: {
      title,
      subTitle,
      metaTitle: t("metaTitle", { title }),
      metaDescription: hasSpecificDate
        ? t("metaDescriptionWithDate", { proposalsLabel, date: byDate, place })
        : t("metaDescriptionFallback", { proposalsLabel, place }),
      canonical,
      notFoundTitle: t("notFoundTitle"),
      notFoundDescription: hasSpecificDate
        ? t("notFoundDescriptionWithDate", { activitiesLabel, date: byDate, place })
        : t("notFoundDescriptionFallback", { activitiesLabel, place }),
    },
  };
}

async function buildCategoryEventsPromise({
  filters,
  fetchParams,
  pageDataPromise,
  categoryName,
  locale,
}: {
  filters: { place: string; byDate: string; category: string };
  fetchParams: FetchEventsParams;
  pageDataPromise: Promise<PageData>;
  categoryName?: string;
  locale: AppLocale;
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

  const localizedEvents = addLocalizedDateFields(events, locale);
  const eventsWithAds = insertAds(localizedEvents);
  const validEvents = localizedEvents.filter(isEventSummaryResponseDTO);
  const pageData = await pageDataPromise;
  const structuredScripts: JsonLdScript[] = [];

  if (validEvents.length > 0) {
    const label = categoryName
      ? `${categoryName} ${filters.place}`
      : `Esdeveniments ${filters.place}`;

    structuredScripts.push({
      id: `events-${filters.place}-${filters.byDate}-${filters.category}`,
      data: generateItemListStructuredData(
        validEvents,
        label,
        undefined,
          locale,
          pageData.canonical
      ),
    });

    const collectionSchema = generateCollectionPageSchema({
      title: pageData.title,
      description: pageData.metaDescription,
      url: pageData.canonical,
      numberOfItems: validEvents.length,
      locale,
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
    noEventsFound,
    serverHasMore,
    structuredScripts: structuredScripts.length ? structuredScripts : undefined,
  };
}
