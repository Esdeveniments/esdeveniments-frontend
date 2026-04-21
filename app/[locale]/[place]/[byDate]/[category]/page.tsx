import { Suspense } from "react";
import { insertAds } from "@lib/api/events";
import { getCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
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
  getRedirectUrl,
} from "@utils/url-filters";
import { buildFallbackUrlForInvalidPlace } from "@utils/url-filters";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { fetchEventsWithFallback } from "@lib/helpers/event-fallback";
import { siteUrl } from "@config/index";
import { fetchPlaceBySlug } from "@lib/api/places";
import { toLocalDateString } from "@utils/helpers";
import { twoWeeksDefault, getDateRangeFromByDate } from "@lib/dates";
import { getTranslations } from "next-intl/server";
import { redirect, notFound } from "next/navigation";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import type { AppLocale } from "types/i18n";
import { isValidCategorySlugFormat } from "@utils/category-mapping";
import { DEFAULT_FILTER_VALUE } from "@utils/constants";
import type { PlacePageEventsResult } from "types/props";
import { addLocalizedDateFields } from "@utils/mappers/event";
import { getPlaceAliasOrInvalidPlaceRedirectUrl } from "@utils/place-alias-or-invalid-redirect";
import PlacePageSkeleton from "@components/ui/common/skeletons/PlacePageSkeleton";

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

  // Fetch categories for metadata generation FIRST
  let categories: CategorySummaryResponseDTO[] = [];
  try {
    categories = await getCategories();
  } catch (error) {
    console.error("Error fetching categories for metadata:", error);
    categories = [];
  }

  // Use empty URLSearchParams since we don't read searchParams (keeps page static)
  const canonicalSearchParams = new URLSearchParams();

  // Preserve user-requested category from path if categories API fails
  if (
    categories.length === 0 &&
    category &&
    isValidCategorySlugFormat(category)
  ) {
    categories = [{ id: -1, name: category, slug: category }];
  }

  const parsed = parseFiltersFromUrl(
    { place, date: byDate, category },
    canonicalSearchParams,
    categories
  );
  const filters = urlToFilterState(parsed);

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

// No generateStaticParams — all filtered pages are rendered on first request and cached.

export default function FilteredPage({
  params,
}: Readonly<{
  params: Promise<{ place: string; byDate: string; category: string }>;
}>) {
  return (
    <Suspense fallback={<PlacePageSkeleton />}>
      <FilteredPageGate paramsPromise={params} />
    </Suspense>
  );
}

async function FilteredPageGate({
  paramsPromise,
}: Readonly<{
  paramsPromise: Promise<{ place: string; byDate: string; category: string }>;
}>) {
  // Fan out all independent fetches; chain translations off locale so they
  // don't block on categories.
  const localePromise = getLocaleSafely();
  const tFallbackPromise = localePromise.then((locale) =>
    getTranslations({ locale, namespace: "App.PlaceByDateCategory" })
  );
  const categoriesPromise = getCategories().catch((error) => {
    console.error("Error fetching categories:", error);
    return [] as CategorySummaryResponseDTO[];
  });

  const [{ place, byDate, category }, locale, categoriesResult, tFallback] =
    await Promise.all([
      paramsPromise,
      localePromise,
      categoriesPromise,
      tFallbackPromise,
    ]);

  try {
    validatePlaceOrThrow(place);
  } catch {
    notFound();
  }

  let categories: CategorySummaryResponseDTO[] = categoriesResult;

  const canonicalSearchParams = new URLSearchParams();

  if (
    categories.length === 0 &&
    category &&
    isValidCategorySlugFormat(category)
  ) {
    categories = [{ id: -1, name: category, slug: category }];
  }

  const parsed = parseFiltersFromUrl(
    { place, date: byDate, category },
    canonicalSearchParams,
    categories
  );

  const redirectUrl = getRedirectUrl(parsed);
  if (redirectUrl) {
    redirect(redirectUrl);
  }

  const filters = urlToFilterState(parsed);

  const fetchParams: FetchEventsParams = {
    page: 0,
    size: 12,
    category:
      filters.category !== DEFAULT_FILTER_VALUE ? filters.category : undefined,
  };

  if (filters.place !== "catalunya") {
    fetchParams.place = filters.place;
  }

  const dateRange = getDateRangeFromByDate(filters.byDate);
  if (dateRange) {
    fetchParams.from = toLocalDateString(dateRange.from);
    fetchParams.to = toLocalDateString(dateRange.until);
  }

  const categoryData = categories.find((cat) => cat.slug === filters.category);

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

  const placeRedirectUrl = await getPlaceAliasOrInvalidPlaceRedirectUrl({
    place,
    locale,
    rawSearchParams: {},
    buildTargetPath: (alias) => `/${alias}/${filters.byDate}/${filters.category}`,
    buildFallbackUrlForInvalidPlace: () =>
      buildFallbackUrlForInvalidPlace({
        byDate,
        category,
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
      place={filters.place}
      category={filters.category}
      date={filters.byDate}
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
