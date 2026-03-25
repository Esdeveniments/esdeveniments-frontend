import { Suspense } from "react";
import type { JSX } from "react";
import dynamic from "next/dynamic";
import HybridEventsList from "@components/ui/hybridEventsList";
import JsonLdServer from "./JsonLdServer";
import { EventsListSkeleton } from "@components/ui/common/skeletons";
import { FilterLoadingProvider } from "@components/context/FilterLoadingContext";
import { UrlFiltersProvider } from "@components/context/UrlFiltersContext";
import FilterLoadingGate from "@components/ui/common/FilterLoadingGate";
import type { PlacePageShellProps } from "types/props";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import { generateBreadcrumbList } from "@components/partials/seo-meta";
import {
  DEFAULT_FILTER_VALUE,
  getDateLabelKey,
} from "@utils/constants";
import {
  addPlaceBreadcrumb,
  addRegionBreadcrumb,
  addIntermediateDateBreadcrumb,
  addCurrentPageBreadcrumb,
  handleCatalunyaHomepage,
  updatePlaceBreadcrumbUrl,
} from "@utils/breadcrumb-helpers";
import type { BreadcrumbItem } from "types/common";
import type { AppLocale } from "types/i18n";
import { buildResponsivePictureSourceUrls } from "@utils/image-cache";
import { getOptimalImageQuality, getResponsiveWidths, getOptimalImageSizes } from "@utils/image-quality";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";

// Lazy load below-the-fold client component via client component wrapper
// This allows us to use ssr: false in Next.js 16 (required for client components)
import LazyClientInteractiveLayer from "./LazyClientInteractiveLayer";

// Lazy load explore navigation - below the fold, server component
const PlacePageExploreNav = dynamic(
  () => import("@components/ui/placePageExploreNav"),
  { loading: () => null }
);

// Lazy load nearby places cross-links - below the fold, server component
const ExploreNearby = dynamic(
  () => import("@components/ui/exploreNearby/ExploreNearby"),
  { loading: () => null }
);


function buildPlaceBreadcrumbs({
  homeLabel,
  place,
  placeLabel,
  regionLabel,
  regionSlug,
  date,
  category,
  categoryLabel,
  locale,
  currentUrl,
  dateLabel,
}: {
  homeLabel: string;
  place: string;
  placeLabel: string;
  regionLabel?: string;
  regionSlug?: string;
  date?: string;
  category?: string;
  categoryLabel?: string;
  locale: AppLocale;
  currentUrl: string;
  dateLabel?: string;
}): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [
    { name: homeLabel, url: toLocalizedUrl("/", locale) },
  ];

  // For cities, add parent region breadcrumb first (SEO: geographic hierarchy)
  if (regionLabel && regionSlug && place !== "catalunya") {
    addRegionBreadcrumb(breadcrumbs, regionLabel, regionSlug, locale);
  }

  // Add place breadcrumb if not catalunya
  addPlaceBreadcrumb(breadcrumbs, place, placeLabel, locale);

  const hasSpecificDate = !!date && date !== DEFAULT_FILTER_VALUE;
  const hasSpecificCategory = !!category && category !== DEFAULT_FILTER_VALUE;

  // Handle different breadcrumb scenarios
  if (hasSpecificDate && !hasSpecificCategory) {
    // Current page is date only
    addCurrentPageBreadcrumb(
      breadcrumbs,
      hasSpecificDate,
      hasSpecificCategory,
      date,
      dateLabel,
      category,
      categoryLabel,
      currentUrl
    );
  } else if (hasSpecificCategory) {
    // Category is present - may have intermediate date
    if (hasSpecificDate) {
      addIntermediateDateBreadcrumb(
        breadcrumbs,
        place,
        date as string,
        dateLabel,
        locale
      );
    }
    addCurrentPageBreadcrumb(
      breadcrumbs,
      hasSpecificDate,
      hasSpecificCategory,
      date,
      dateLabel,
      category,
      categoryLabel,
      currentUrl
    );
  } else if (place === "catalunya") {
    // Homepage canonical
    handleCatalunyaHomepage(breadcrumbs, homeLabel, currentUrl);
  } else {
    // Current page is place only
    updatePlaceBreadcrumbUrl(breadcrumbs, currentUrl);
  }

  return breadcrumbs;
}

const buildFilterLabels = async () => {
  const tFilters = await getTranslations("Config.Filters");
  const tFiltersUi = await getTranslations("Components.Filters");
  const tByDates = await getTranslations("Config.ByDates");

  return {
    triggerLabel: tFiltersUi("triggerLabel"),
    displayNameMap: {
      place: tFilters("place"),
      category: tFilters("category"),
      byDate: tFilters("date"),
      distance: tFilters("distance"),
      searchTerm: tFilters("search"),
    },
    byDates: {
      avui: tByDates("today"),
      dema: tByDates("tomorrow"),
      setmana: tByDates("week"),
      "cap-de-setmana": tByDates("weekend"),
    },
  };
};

export default async function PlacePageShell({
  eventsPromise,
  shellDataPromise,
  place,
  category,
  date,
  categories = [],
  webPageSchemaFactory,
}: PlacePageShellProps) {
  const { placeTypeLabel } = await shellDataPromise;
  const filterLabels = await buildFilterLabels();

  return (
    <FilterLoadingProvider>
      <UrlFiltersProvider categories={categories}>
        <Suspense fallback={<EventsListSkeleton />}>
          <PlacePageContent
            shellDataPromise={shellDataPromise}
            eventsPromise={eventsPromise}
            place={place}
            category={category}
            date={date}
            categories={categories}
            webPageSchemaFactory={webPageSchemaFactory}
          />
        </Suspense>

        {/* Client Interactive Layer - Lazy loaded (filters, below fold) */}
        <Suspense fallback={null}>
          <LazyClientInteractiveLayer
            categories={categories}
            placeTypeLabel={placeTypeLabel}
            filterLabels={filterLabels}
          />
        </Suspense>
      </UrlFiltersProvider>
    </FilterLoadingProvider>
  );
}

export async function ClientLayerWithPlaceLabel({
  shellDataPromise,
  categories = [],
  filterLabels: filterLabelsOverride,
}: Pick<PlacePageShellProps, "shellDataPromise" | "categories"> & {
  filterLabels?: Awaited<ReturnType<typeof buildFilterLabels>>;
}) {
  const filterLabels =
    filterLabelsOverride ??
    (await buildFilterLabels().catch(() => ({
      triggerLabel: "",
      displayNameMap: {
        place: "place",
        category: "category",
        byDate: "date",
        distance: "distance",
        searchTerm: "search",
      },
      byDates: {},
    })));
  const { placeTypeLabel } = await shellDataPromise;

  return (
    <FilterLoadingProvider>
      <UrlFiltersProvider categories={categories}>
        <Suspense fallback={null}>
          <LazyClientInteractiveLayer
            categories={categories}
            placeTypeLabel={placeTypeLabel}
            filterLabels={filterLabels}
          />
        </Suspense>
      </UrlFiltersProvider>
    </FilterLoadingProvider>
  );
}

async function PlacePageContent({
  shellDataPromise,
  eventsPromise,
  place,
  category,
  date,
  categories,
  webPageSchemaFactory,
}: Pick<
  PlacePageShellProps,
  | "shellDataPromise"
  | "eventsPromise"
  | "place"
  | "category"
  | "date"
  | "categories"
  | "webPageSchemaFactory"
>): Promise<JSX.Element> {
  // Await shell data and events in parallel
  const [{ placeTypeLabel, pageData }, { events, noEventsFound, serverHasMore, structuredScripts }] =
    await Promise.all([shellDataPromise, eventsPromise]);

  const tBreadcrumbs = await getTranslations("Components.Breadcrumbs");
  const tByDates = await getTranslations("Config.ByDates");
  const locale = await getLocaleSafely();

  // Preload LCP image — first real event card image.
  // Uses responsive srcSet so the browser picks the right width for the viewport.
  const firstRealEvent = events.find(isEventSummaryResponseDTO);
  const lcpSources = firstRealEvent?.imageUrl
    ? buildResponsivePictureSourceUrls(
      firstRealEvent.imageUrl,
      firstRealEvent.hash || firstRealEvent.updatedAt,
      {
        quality: getOptimalImageQuality({ isPriority: true, isExternal: true }),
      },
      getResponsiveWidths("list")
    )
    : null;
  const lcpSizes = getOptimalImageSizes("list");

  // Generate webPageSchema after shell data is available
  const webPageSchema = webPageSchemaFactory
    ? webPageSchemaFactory({ placeTypeLabel, pageData })
    : null;

  const hasSpecificCategory = !!category && category !== DEFAULT_FILTER_VALUE;
  const categoryName =
    hasSpecificCategory
      ? categories?.find((c) => c.slug === category)?.name || category
      : undefined;

  const hasSpecificDate = !!date && date !== DEFAULT_FILTER_VALUE;
  let dateLabel: string | undefined;
  if (hasSpecificDate) {
    const key = getDateLabelKey(date as string);
    dateLabel = key ? tByDates(key) : (date as string);
  }

  const breadcrumbItems = buildPlaceBreadcrumbs({
    homeLabel: tBreadcrumbs("home"),
    place,
    placeLabel: placeTypeLabel.label || place,
    regionLabel: placeTypeLabel.regionLabel,
    regionSlug: placeTypeLabel.regionSlug,
    date,
    category,
    categoryLabel: categoryName,
    locale,
    currentUrl: pageData.canonical,
    dateLabel,
  });

  const breadcrumbListSchema = generateBreadcrumbList(breadcrumbItems);

  return (
    <>
      {/* Preload LCP card image for faster Largest Contentful Paint */}
      {lcpSources && (
        <link
          rel="preload"
          as="image"
          imageSrcSet={lcpSources.webpSrcSet}
          imageSizes={lcpSizes}
          type="image/webp"
          fetchPriority="high"
        />
      )}

      {webPageSchema && (
        <JsonLdServer id="webpage-schema" data={webPageSchema} />
      )}

      {breadcrumbListSchema && (
        <JsonLdServer id="breadcrumbs-schema" data={breadcrumbListSchema} />
      )}

      {structuredScripts?.map((script) => (
        <JsonLdServer key={script.id} id={script.id} data={script.data} />
      ))}

      <FilterLoadingGate>
        <HybridEventsList
          initialEvents={events}
          placeTypeLabel={placeTypeLabel}
          pageData={pageData}
          noEventsFound={noEventsFound}
          place={place}
          category={category}
          date={date}
          serverHasMore={serverHasMore}
          categories={categories}
        />
      </FilterLoadingGate>

      {/* Explore Navigation - SEO internal links (below events) */}
      <Suspense fallback={null}>
        <PlacePageExploreNav
          place={place}
          date={date}
          category={category}
          categories={categories}
          placeLabel={placeTypeLabel.label || place}
        />
      </Suspense>

      {/* Explore Nearby - SEO cross-links to related places */}
      <Suspense fallback={null}>
        <ExploreNearby
          place={place}
          placeType={placeTypeLabel.type}
        />
      </Suspense>

    </>
  );
}
