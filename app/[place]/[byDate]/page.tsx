import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import { insertAds } from "@lib/api/events";
import { getCategories, fetchCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabelCached, toLocalDateString } from "@utils/helpers";
import { hasNewsForPlace } from "@lib/api/news";
import { generatePagesData } from "@components/partials/generatePagesData";
import {
  buildPageMeta,
  generateItemListStructuredData,
  generateWebPageSchema,
  generateCollectionPageSchema,
} from "@components/partials/seo-meta";
import {
  twoWeeksDefault,
  getDateRangeFromByDate,
  isValidDateSlug,
} from "@lib/dates";
import {
  PlaceTypeAndLabel,
  ByDateOptions,
  PageData,
  JsonLdScript,
} from "types/common";
import type { AppLocale } from "types/i18n";
import type { CategorySummaryResponseDTO } from "types/api/category";
import { FetchEventsParams } from "types/event";
import { fetchEventsWithFallback } from "@lib/helpers/event-fallback";
import PlacePageShell from "@components/partials/PlacePageShell";
import {
  parseFiltersFromUrl,
  getRedirectUrl,
  toUrlSearchParams,
} from "@utils/url-filters";
import { buildFallbackUrlForInvalidPlace } from "@utils/url-filters";
import { redirect, notFound } from "next/navigation";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { topStaticGenerationPlaces } from "@utils/priority-places";
import { VALID_DATES } from "@lib/dates";
import { fetchPlaces, fetchPlaceBySlug } from "@lib/api/places";
import { isValidCategorySlugFormat } from "@utils/category-mapping";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";
import type { PlacePageEventsResult } from "types/props";
import { siteUrl } from "@config/index";
import { addLocalizedDateFields } from "@utils/mappers/event";

// page-level ISR not set here; fetch-level caching applies

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ place: string; byDate: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ place, byDate }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const validation = validatePlaceForMetadata(place);
  if (!validation.isValid) {
    return validation.fallbackMetadata;
  }

  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await getCategories();
  } catch (error) {
    console.error("generateMetadata: Error fetching categories:", error);
  }

  // Convert searchParams to URLSearchParams for parsing
  const canonicalSearchParams = toUrlSearchParams(rawSearchParams);

  // Preserve user-requested category even if categories API fails
  if (categories.length === 0) {
    const fallbackSlug = canonicalSearchParams.get("category");
    if (fallbackSlug && isValidCategorySlugFormat(fallbackSlug)) {
      categories = [{ id: -1, name: fallbackSlug, slug: fallbackSlug }];
    }
  }

  const parsed = parseFiltersFromUrl(
    { place, date: byDate },
    canonicalSearchParams,
    categories
  );

  const actualDate = parsed.segments.date;
  const actualCategory = parsed.segments.category;

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabelCached(
    place
  );

  const categoryData = categories.find((cat) => cat.slug === actualCategory);

  const pageData = await generatePagesData({
    place,
    byDate: actualDate as ByDateOptions,
    placeTypeLabel,
    category:
      actualCategory && actualCategory !== DEFAULT_FILTER_VALUE
        ? actualCategory
        : undefined,
    categoryName: categoryData?.name,
    search: parsed.queryParams.search,
  });
  const locale = await getLocaleSafely();
  return buildPageMeta({
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
    locale,
  });
}

export async function generateStaticParams() {
  // Only generate static pages for top ~15 places to keep build size under 230MB
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
    places = [];
  }

  // Validate categories exist in API to avoid generating pages for removed/renamed categories
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await fetchCategories();
  } catch (error) {
    console.warn(
      "generateStaticParams: Error fetching categories for validation:",
      error
    );
    // Fallback: use hardcoded list if API fails (runtime validation will handle invalid slugs)
    categories = [];
  }

  // Filter to only places that exist in API
  const placeSlugs = new Set(places.map((p) => p.slug));
  const validPlaces =
    places.length > 0
      ? topStaticGenerationPlaces.filter((slug) => placeSlugs.has(slug))
      : topStaticGenerationPlaces; // Fallback if API failed

  const topDates = VALID_DATES.filter(
    (date) => date !== DEFAULT_FILTER_VALUE
  ) as ByDateOptions[];

  // Get top categories from dynamic data (API is source of truth)
  // Validate categories exist in API to avoid generating pages for removed/renamed categories
  let topCategories: string[] = [];
  if (categories.length > 0) {
    // Use first 4 dynamic categories (same as getTopStaticCombinations)
    topCategories = categories.slice(0, 4).map((cat) => cat.slug);
  }
  // If no categories available, don't generate category pages (only place/date combinations)

  const combinations = [];

  for (const place of validPlaces) {
    for (const date of topDates) {
      combinations.push({ place, byDate: date });
    }

    for (const category of topCategories) {
      combinations.push({ place, byDate: category });
    }
  }

  return combinations;
}

export default async function ByDatePage({
  params,
  searchParams,
}: {
  params: Promise<{ place: string; byDate: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { place, byDate } = await params;
  const search = await searchParams;
  const locale: AppLocale = await getLocaleSafely();
  const tFallback = await getTranslations({
    locale,
    namespace: "App.PlaceByDate",
  });

  try {
    validatePlaceOrThrow(place);
  } catch {
    notFound();
  }

  // Note: We don't do early place existence checks to avoid creating an enumeration oracle.
  // Invalid places will naturally result in empty event lists, which the page handles gracefully.

  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await getCategories();
  } catch (error) {
    console.error(
      "🔥 [place]/[byDate]/page.tsx - Error fetching categories:",
      error
    );
    categories = [];
  }

  // Convert searchParams to URLSearchParams for parsing
  const urlSearchParams = toUrlSearchParams(search);

  // Preserve user-requested category even if categories API fails
  if (categories.length === 0) {
    const fallbackSlug = urlSearchParams.get("category");
    if (fallbackSlug && isValidCategorySlugFormat(fallbackSlug)) {
      categories = [{ id: -1, name: fallbackSlug, slug: fallbackSlug }];
    } else if (!isValidDateSlug(byDate) && isValidCategorySlugFormat(byDate)) {
      // For two-segment URLs like /barcelona/teatre, byDate might actually be a category
      // Create a synthetic category to preserve user intent when categories API fails
      categories = [{ id: -1, name: byDate, slug: byDate }];
    }
  }

  const parsed = parseFiltersFromUrl(
    { place, date: byDate },
    urlSearchParams,
    categories
  );

  // Canonicalization note:
  // - Middleware handles structural normalization (folding query date/category, omitting "tots")
  // - This page-level redirect remains to validate category slugs against dynamic categories
  //   and normalize unknown slugs (middleware cannot fetch categories at edge time)
  // - When middleware already normalized, this is a no-op
  const redirectUrl = getRedirectUrl(parsed);
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const actualDate = parsed.segments.date;
  const actualCategory = parsed.segments.category;

  const searchCategory =
    typeof search.category === "string" ? search.category : undefined;
  const finalCategory = searchCategory || actualCategory;

  const paramsForFetch: FetchEventsParams = {
    page: 0,
    size: 10,
  };

  // Only add date filters if actualDate is not "tots"
  const dateRange = getDateRangeFromByDate(actualDate);
  if (dateRange) {
    paramsForFetch.from = toLocalDateString(dateRange.from);
    paramsForFetch.to = toLocalDateString(dateRange.until);
  }

  if (place !== "catalunya") {
    paramsForFetch.place = place;
  }

  if (finalCategory && finalCategory !== DEFAULT_FILTER_VALUE) {
    paramsForFetch.category = finalCategory;
  }

  // Intentionally do NOT apply querystring filters (search/distance/lat/lon) on the server.
  // These are handled client-side to keep ISR query-agnostic.

  const categoryData = categories.find((cat) => cat.slug === finalCategory);

  const placeShellDataPromise = (async () => {
    try {
      const placeTypeLabel: PlaceTypeAndLabel =
        await getPlaceTypeAndLabelCached(place);
      const pageData: PageData = await generatePagesData({
        place,
        byDate: actualDate as ByDateOptions,
        placeTypeLabel,
        category:
          finalCategory && finalCategory !== DEFAULT_FILTER_VALUE
            ? finalCategory
            : undefined,
        categoryName: categoryData?.name,
        search: parsed.queryParams.search,
      });
      return { placeTypeLabel, pageData };
    } catch (error) {
      console.error(
        "Place by date page: unable to build shell data",
        error
      );
      return buildFallbackPlaceByDateShellData({
        place,
        actualDate,
        finalCategory,
        categoryName: categoryData?.name,
        t: tFallback,
      });
    }
  })();

  const eventsPromise = buildPlaceByDateEventsPromise({
    place,
    finalCategory,
    actualDate,
    paramsForFetch,
    pageDataPromise: placeShellDataPromise.then((data) => data.pageData),
    locale,
  });

  const hasNewsPromise = hasNewsForPlace(place).catch((error) => {
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
        rawSearchParams: search,
      });
      redirect(target);
    }
  }

  return (
    <PlacePageShell
      eventsPromise={eventsPromise}
      shellDataPromise={placeShellDataPromise}
      place={place}
      category={finalCategory}
      date={actualDate}
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

function buildFallbackPlaceByDateShellData({
  place,
  actualDate,
  finalCategory,
  categoryName,
  t,
}: {
  place: string;
  actualDate: string;
  finalCategory?: string;
  categoryName?: string;
  t: (key: string, values?: Record<string, string>) => string;
}): { placeTypeLabel: PlaceTypeAndLabel; pageData: PageData } {
  const placeTypeLabel: PlaceTypeAndLabel = { type: "", label: place };
  const hasSpecificDate =
    actualDate && actualDate !== DEFAULT_FILTER_VALUE && actualDate !== "";
  const dateLabel = hasSpecificDate ? actualDate : t("dateFallback");
  const categoryLabel =
    finalCategory && finalCategory !== DEFAULT_FILTER_VALUE
      ? categoryName || finalCategory
      : "";
  const categoryTitleSuffix = categoryLabel ? ` · ${categoryLabel}` : "";
  const categorySubSuffix = categoryLabel ? ` (${categoryLabel})` : "";
  const categoryDescriptionSuffix = categoryLabel
    ? t("categoryDescriptionSuffix", { categoryLabel })
    : "";
  const canonicalSegments = [place];
  if (hasSpecificDate) {
    canonicalSegments.push(actualDate);
  }
  const canonicalPath = `/${canonicalSegments.join("/")}`;
  const canonical = `${siteUrl}${canonicalPath}`;
  const title = t("title", {
    dateLabel,
    place,
    categoryLabel: categoryTitleSuffix,
  });
  const subTitle = hasSpecificDate
    ? t("subtitleWithDate", {
      date: actualDate,
      place,
      categoryLabel: categorySubSuffix,
    })
    : t("subtitleFallback", { place, categoryLabel: categorySubSuffix });

  return {
    placeTypeLabel,
    pageData: {
      title,
      subTitle,
      metaTitle: t("metaTitle", { title }),
      metaDescription: hasSpecificDate
        ? t("metaDescriptionWithDate", {
          date: actualDate,
          place,
          categoryDescriptionSuffix,
        })
        : t("metaDescriptionFallback", {
          place,
          categoryDescriptionSuffix,
        }),
      canonical,
      notFoundTitle: t("notFoundTitle"),
      notFoundDescription: hasSpecificDate
        ? t("notFoundDescriptionWithDate", { date: actualDate, place })
        : t("notFoundDescriptionFallback", { place }),
    },
  };
}

async function buildPlaceByDateEventsPromise({
  place,
  finalCategory,
  actualDate,
  paramsForFetch,
  pageDataPromise,
  locale,
}: {
  place: string;
  finalCategory?: string;
  actualDate: string;
  paramsForFetch: FetchEventsParams;
  pageDataPromise: Promise<PageData>;
  locale: AppLocale;
}): Promise<PlacePageEventsResult> {
  const { eventsResponse, events, noEventsFound } =
    await fetchEventsWithFallback({
      place,
      initialParams: paramsForFetch,
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
    const itemListSchema = generateItemListStructuredData(
      validEvents,
      finalCategory && finalCategory !== DEFAULT_FILTER_VALUE
        ? `Esdeveniments ${finalCategory} ${place}`
        : `Esdeveniments ${actualDate} ${place}`,
      undefined,
      locale
    );

    structuredScripts.push({
      id: `events-${place}-${actualDate}`,
      data: itemListSchema,
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
        id: `collection-${place}-${actualDate}`,
        data: collectionSchema,
      });
    }
  }

  return {
    events: eventsWithAds,
    noEventsFound,
    serverHasMore,
    structuredScripts: structuredScripts.length
      ? structuredScripts
      : undefined,
  };
}
