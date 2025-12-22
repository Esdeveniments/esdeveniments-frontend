import { Suspense } from "react";
import type { JSX } from "react";
import dynamic from "next/dynamic";
import HybridEventsList from "@components/ui/hybridEventsList";
import JsonLdServer from "./JsonLdServer";
import { EventsListSkeleton } from "@components/ui/common/skeletons";
import { FilterLoadingProvider } from "@components/context/FilterLoadingContext";
import FilterLoadingGate from "@components/ui/common/FilterLoadingGate";
import { buildFaqJsonLd } from "@utils/helpers";
import { buildListPageFaqItems } from "@utils/list-page-faq";
import type { PlacePageShellProps } from "types/props";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import { generateBreadcrumbList } from "@components/partials/seo-meta";
import {
  DEFAULT_FILTER_VALUE,
  byDateSlugToLabelKey,
} from "@utils/constants";
import type { BreadcrumbItem } from "types/common";
import type { AppLocale } from "types/i18n";

// Lazy load below-the-fold client component via client component wrapper
// This allows us to use ssr: false in Next.js 16 (required for client components)
import LazyClientInteractiveLayer from "./LazyClientInteractiveLayer";

// Lazy load server component directly (no client wrapper needed)
// FAQ section is below the fold, so we can lazy load it to reduce initial bundle
const ListPageFaq = dynamic(() => import("@components/ui/common/faq/ListPageFaq"), {
  // No ssr: false needed - it's a server component
  loading: () => null, // FAQ section is below the fold
});

function buildPlaceBreadcrumbs({
  homeLabel,
  place,
  placeLabel,
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

  // Treat the default "catalunya" agenda as the homepage canonical.
  if (place !== "catalunya") {
    breadcrumbs.push({
      name: placeLabel || place,
      url: toLocalizedUrl(`/${place}`, locale),
    });
  }

  const hasSpecificDate = !!date && date !== DEFAULT_FILTER_VALUE;
  const hasSpecificCategory = !!category && category !== DEFAULT_FILTER_VALUE;

  const pathSegments: string[] = [];
  if (place !== "catalunya") pathSegments.push(place);
  if (hasSpecificDate) pathSegments.push(date as string);
  if (hasSpecificCategory) pathSegments.push(category as string);

  // Only include intermediate crumbs when they aren't the current page.
  if (hasSpecificDate && !hasSpecificCategory) {
    // current page is date
    breadcrumbs.push({
      name: dateLabel || (date as string),
      url: currentUrl,
    });
  } else if (hasSpecificCategory) {
    if (hasSpecificDate) {
      // date is intermediate
      const datePath = `/${[place, date].filter(Boolean).join("/")}`;
      breadcrumbs.push({
        name: dateLabel || (date as string),
        url: toLocalizedUrl(datePath, locale),
      });
    }

    // current page is category (or place+category)
    breadcrumbs.push({
      name: categoryLabel || (category as string),
      url: currentUrl,
    });
  } else if (place === "catalunya") {
    // homepage canonical
    breadcrumbs[0] = { name: homeLabel, url: currentUrl };
  } else if (pathSegments.length === 1) {
    // current page is place
    // If we already pushed place above, ensure its URL is canonical for this page.
    breadcrumbs[breadcrumbs.length - 1] = {
      ...breadcrumbs[breadcrumbs.length - 1],
      url: currentUrl,
    };
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
  hasNewsPromise,
  categories = [],
  webPageSchemaFactory,
}: PlacePageShellProps) {
  const { placeTypeLabel } = await shellDataPromise;
  const filterLabels = await buildFilterLabels();

  return (
    <FilterLoadingProvider>
      <Suspense fallback={<EventsListSkeleton />}>
        <PlacePageContent
          shellDataPromise={shellDataPromise}
          eventsPromise={eventsPromise}
          place={place}
          category={category}
          date={date}
          hasNewsPromise={hasNewsPromise}
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
    <LazyClientInteractiveLayer
      categories={categories}
      placeTypeLabel={placeTypeLabel}
      filterLabels={filterLabels}
    />
  );
}

async function PlacePageContent({
  shellDataPromise,
  eventsPromise,
  place,
  category,
  date,
  hasNewsPromise,
  categories,
  webPageSchemaFactory,
}: Pick<
  PlacePageShellProps,
  | "shellDataPromise"
  | "eventsPromise"
  | "place"
  | "category"
  | "date"
  | "hasNewsPromise"
  | "categories"
  | "webPageSchemaFactory"
>): Promise<JSX.Element> {
  // Await shell data and events in parallel
  const [{ placeTypeLabel, pageData }, { events, noEventsFound, serverHasMore, structuredScripts }, hasNews] =
    await Promise.all([
      shellDataPromise,
      eventsPromise,
      hasNewsPromise || Promise.resolve(false),
    ]);

  const tFaq = await getTranslations("Utils.ListPageFaq");
  const tBreadcrumbs = await getTranslations("Components.Breadcrumbs");
  const tByDates = await getTranslations("Config.ByDates");
  const locale = await getLocaleSafely();

  // Generate webPageSchema after shell data is available
  const webPageSchema = webPageSchemaFactory
    ? webPageSchemaFactory(pageData)
    : null;

  const faqItems = buildListPageFaqItems({
    place,
    date,
    category,
    placeTypeLabel,
    categories,
    locale,
    labels: {
      q1: tFaq("q1", { contextInline: "{contextInline}" }),
      a1: tFaq("a1", { capitalizedContext: "{capitalizedContext}" }),
      q2: tFaq("q2", { contextInline: "{contextInline}" }),
      a2: tFaq("a2", { contextInline: "{contextInline}" }),
      q3: tFaq("q3", {
        categoryName: "{categoryName}",
        contextInline: "{contextInline}",
      }),
      a3: tFaq("a3", {
        categoryName: "{categoryName}",
        contextInline: "{contextInline}",
      }),
    },
    dateLabels: {
      inline: {
        avui: tFaq("dateInline.today"),
        dema: tFaq("dateInline.tomorrow"),
        setmana: tFaq("dateInline.week"),
        "cap-de-setmana": tFaq("dateInline.weekend"),
      },
      capitalized: {
        avui: tFaq("dateCapitalized.today"),
        dema: tFaq("dateCapitalized.tomorrow"),
        setmana: tFaq("dateCapitalized.week"),
        "cap-de-setmana": tFaq("dateCapitalized.weekend"),
      },
      fallbackInline: tFaq("dateInline.fallback"),
      fallbackCapitalized: tFaq("dateCapitalized.fallback"),
    },
  });
  const faqJsonLd =
    faqItems.length > 1 ? buildFaqJsonLd(faqItems) : null;

  const hasSpecificCategory = !!category && category !== DEFAULT_FILTER_VALUE;
  const categoryName =
    hasSpecificCategory
      ? categories?.find((c) => c.slug === category)?.name || category
      : undefined;

  const hasSpecificDate = !!date && date !== DEFAULT_FILTER_VALUE;
  const dateLabel = hasSpecificDate
    ? (() => {
      const key = byDateSlugToLabelKey[date as string];
      return key ? tByDates(key) : (date as string);
    })()
    : undefined;

  const breadcrumbItems = buildPlaceBreadcrumbs({
    homeLabel: tBreadcrumbs("home"),
    place,
    placeLabel: placeTypeLabel.label || place,
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
      {webPageSchema && (
        <JsonLdServer id="webpage-schema" data={webPageSchema} />
      )}

      {breadcrumbListSchema && (
        <JsonLdServer id="breadcrumbs-schema" data={breadcrumbListSchema} />
      )}

      {structuredScripts?.map((script) => (
        <JsonLdServer key={script.id} id={script.id} data={script.data} />
      ))}

      {faqJsonLd && (
        <JsonLdServer
          id={`faq-${place}-${date ?? "general"}`}
          data={faqJsonLd}
        />
      )}

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
          hasNews={hasNews}
          categories={categories}
        />
      </FilterLoadingGate>

      {/* FAQ Section - Lazy loaded (below the fold, server component) */}
      <Suspense fallback={null}>
        <ListPageFaq items={faqItems} />
      </Suspense>
    </>
  );
}
