import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import { insertAds } from "@lib/api/events";
import { getCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabelCached, toLocalDateString } from "@utils/helpers";
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
} from "@utils/url-filters";
import { buildFallbackUrlForInvalidPlace } from "@utils/url-filters";
import { redirect, notFound } from "next/navigation";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { fetchPlaceBySlug } from "@lib/api/places";
import { isValidCategorySlugFormat } from "@utils/category-mapping";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";
import type { PlacePageEventsResult } from "types/props";
import { siteUrl } from "@config/index";
import { addLocalizedDateFields } from "@utils/mappers/event";
import { getPlaceAliasOrInvalidPlaceRedirectUrl } from "@utils/place-alias-or-invalid-redirect";
import PlacePageSkeleton from "@components/ui/common/skeletons/PlacePageSkeleton";

// page-level ISR not set here; fetch-level caching applies

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string; byDate: string }>;
}) {
  const { place, byDate } = await params;

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

  // Use empty URLSearchParams since we don't read searchParams (keeps page static)
  const canonicalSearchParams = new URLSearchParams();

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

// No generateStaticParams — all place/date pages are rendered on first request and cached.

export default function ByDatePage({
  params,
}: {
  params: Promise<{ place: string; byDate: string }>;
}) {
  return (
    <Suspense fallback={<PlacePageSkeleton />}>
      <ByDateGate paramsPromise={params} />
    </Suspense>
  );
}

async function ByDateGate({
  paramsPromise,
}: {
  paramsPromise: Promise<{ place: string; byDate: string }>;
}) {
  const { place, byDate } = await paramsPromise;

  try {
    validatePlaceOrThrow(place);
  } catch {
    notFound();
  }

  const locale: AppLocale = await getLocaleSafely();

  const [tFallback, categoriesResult] = await Promise.all([
    getTranslations({
      locale,
      namespace: "App.PlaceByDate",
    }),
    getCategories().catch((error) => {
      console.error(
        "🔥 [place]/[byDate]/page.tsx - Error fetching categories:",
        error
      );
      return [] as CategorySummaryResponseDTO[];
    }),
  ]);

  let categories: CategorySummaryResponseDTO[] = categoriesResult;

  // Use empty searchParams to keep pages static (ISR-compatible)
  const urlSearchParams = new URLSearchParams();

  if (categories.length === 0) {
    const fallbackSlug = urlSearchParams.get("category");
    if (fallbackSlug && isValidCategorySlugFormat(fallbackSlug)) {
      categories = [{ id: -1, name: fallbackSlug, slug: fallbackSlug }];
    } else if (!isValidDateSlug(byDate) && isValidCategorySlugFormat(byDate)) {
      categories = [{ id: -1, name: byDate, slug: byDate }];
    }
  }

  const parsed = parseFiltersFromUrl(
    { place, date: byDate },
    urlSearchParams,
    categories
  );

  // Client-side redirect since we're inside a Suspense boundary. Middleware
  // already handles structural normalization, so this only fires on the
  // edge case of category-slug rewrites the edge can't resolve.
  const redirectUrl = getRedirectUrl(parsed);
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const actualDate = parsed.segments.date;
  const actualCategory = parsed.segments.category;
  const finalCategory = actualCategory;

  const paramsForFetch: FetchEventsParams = {
    page: 0,
    size: 12,
  };

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

  // Client-side alias redirect (same trade-off as place page).
  const placeRedirectUrl = await getPlaceAliasOrInvalidPlaceRedirectUrl({
    place,
    locale,
    rawSearchParams: {},
    buildTargetPath: (alias) => `/${alias}/${actualDate}`,
    buildFallbackUrlForInvalidPlace: () =>
      buildFallbackUrlForInvalidPlace({
        byDate,
        rawSearchParams: {},
      }),
    fetchPlaceBySlug,
  });
  if (placeRedirectUrl) {
    redirect(placeRedirectUrl);
  }

  return (
    <PlacePageShell
      eventsPromise={eventsPromise}
      shellDataPromise={placeShellDataPromise}
      place={place}
      category={finalCategory}
      date={actualDate}
      categories={categories}
      webPageSchemaFactory={({ placeTypeLabel, pageData }) =>
        generateWebPageSchema({
          title: pageData.title,
          description: pageData.metaDescription,
          url: pageData.canonical,
          locale,
          ...(placeTypeLabel.regionLabel &&
            placeTypeLabel.regionSlug && {
              containedInPlace: {
                name: placeTypeLabel.regionLabel,
                url: toLocalizedUrl(`/${placeTypeLabel.regionSlug}`, locale),
              },
            }),
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
      locale,
      pageData.canonical
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
