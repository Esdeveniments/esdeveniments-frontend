import { fetchEventsCached, insertAds } from "@lib/api/events";
import { Suspense, use } from "react";
import type { JSX } from "react";
import { fetchCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabelCached, formatPlaceName } from "@utils/helpers";
import { fetchEventsWithFallback } from "@lib/helpers/event-fallback";
import { generatePagesData } from "@components/partials/generatePagesData";
import {
  buildPageMeta,
  generateItemListStructuredData,
  generateWebPageSchema,
} from "@components/partials/seo-meta";
import type {
  PlaceTypeAndLabel,
  PageData,
} from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import type { FetchEventsParams } from "types/event";
import PlacePageShell from "@components/partials/PlacePageShell";
import PlacePageSkeleton from "@components/ui/common/skeletons/PlacePageSkeleton";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { fetchPlaceBySlug } from "@lib/api/places";
import { redirect, notFound } from "next/navigation";
import type { PlacePageEventsResult } from "types/props";
import { twoWeeksDefault } from "@lib/dates";
import { siteUrl } from "@config/index";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { formatPlacePreposition } from "@utils/string-helpers";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";
import { addLocalizedDateFields } from "@utils/mappers/event";
import { toLocalizedUrl } from "@utils/i18n-seo";
import { getPlaceAliasOrInvalidPlaceRedirectUrl } from "@utils/place-alias-or-invalid-redirect";
import {
  getPlaceExpandability,
  isExpandableByCount,
} from "@lib/seo/place-expandability";
import {
  SSR_EVENTS_SIZE_EXPANDABLE,
  SSR_EVENTS_SIZE_THIN,
} from "@utils/constants";

// Note: This page is fully dynamic (on-demand ISR). Server renders canonical, query-agnostic HTML.
// All query filters (search, distance, lat, lon) are handled client-side.
// No generateStaticParams — all place pages are rendered on first request and cached.

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/[place]">) {
  const { place } = await params;

  const validation = validatePlaceForMetadata(place);
  if (!validation.isValid) {
    return validation.fallbackMetadata;
  }

  const locale = (await rootLocale()) as AppLocale;

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabelCached(
    place
  );
  const pageData: PageData = await generatePagesData({
    place,
    byDate: "",
    placeTypeLabel,
    locale,
  });
  return buildPageMeta({
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
    locale,
  });
}

// Sync page component: unwraps params with use() and immediately returns a
// Suspense boundary so the static shell (layout) can flush before any async
// work. All async logic — locale, validation, categories, alias/404 redirect,
// shell data, and events fetch — lives inside PlacePageGate and streams in.
export default function Page({
  params,
}: PageProps<"/[locale]/[place]">) {
  const { place } = use(params);

  // Fallback while PlacePageGate suspends: the page skeleton for users and
  // an h1 derived from the slug for crawlers. This boundary catches every
  // suspension below it, so [place]/loading.tsx only shows while params
  // resolve. It doesn't catch errors, but if the gate throws on the server
  // React leaves this fallback in the HTML and retries on the client, so
  // crawlers still get the h1.
  const placeLabel = formatPlaceName(place);

  return (
    <Suspense
      fallback={
        <>
          <h1 className="sr-only">{placeLabel}</h1>
          <PlacePageSkeleton />
        </>
      }
    >
      <PlacePageGate place={place} />
    </Suspense>
  );
}

export async function PlacePageGate({ place }: { place: string }): Promise<JSX.Element> {
  const locale = (await rootLocale()) as AppLocale;

  try {
    validatePlaceOrThrow(place);
  } catch {
    notFound();
  }

  const categoriesPromise = fetchCategories().catch((error) => {
    console.error("Error fetching categories:", error);
    return [] as CategorySummaryResponseDTO[];
  });
  const placeShellDataPromise = (async () => {
    try {
      const placeTypeLabel: PlaceTypeAndLabel =
        await getPlaceTypeAndLabelCached(place);
      const pageData: PageData = await generatePagesData({
        place,
        byDate: "",
        placeTypeLabel,
        locale,
      });
      return { placeTypeLabel, pageData };
    } catch (error) {
      console.error("Place page: unable to build shell data", error);
      // Fetch translations only on error path (avoids blocking happy path)
      const t = await getTranslations({ locale, namespace: "App.Publish" });
      return await buildFallbackPlaceShellData(
        place,
        t("noEventsFound"),
        locale
      );
    }
  })();

  const eventsPromise = buildPlaceEventsPromise({ place, locale });

  // Late existence check to preserve UX without creating an enumeration oracle
  // Note: We pass empty searchParams to keep pages static (ISR-compatible).
  // Query params are not preserved on alias redirects (rare edge case).
  // Runs alongside categories: neither needs the other.
  const [categories, placeRedirectUrl] = await Promise.all([
    categoriesPromise,
    getPlaceAliasOrInvalidPlaceRedirectUrl({
      place,
      locale,
      rawSearchParams: {},
      buildTargetPath: (alias) => `/${alias}`,
      fetchPlaceBySlug,
    }),
  ]);
  if (placeRedirectUrl) {
    redirect(placeRedirectUrl);
  }

  return (
    <PlacePageShell
      eventsPromise={eventsPromise}
      shellDataPromise={placeShellDataPromise}
      place={place}
      categories={categories}
      webPageSchemaFactory={({ placeTypeLabel, pageData }) =>
        generateWebPageSchema({
          title: pageData.title,
          description: pageData.metaDescription,
          url: pageData.canonical,
          locale,
          // SEO: For city pages, include parent region (comarca) relationship
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

async function buildFallbackPlaceShellData(
  place: string,
  notFoundDescription: string,
  locale: AppLocale
): Promise<{
  placeTypeLabel: PlaceTypeAndLabel;
  pageData: PageData;
}> {
  const tFallback = await getTranslations({
    locale,
    namespace: "App.PlaceFallback",
  });
  const fallbackPlaceTypeLabel: PlaceTypeAndLabel = { type: "", label: place };
  const pathSegment = place === "catalunya" ? "" : `/${place}`;
  const canonical = `${siteUrl}${pathSegment}`;
  const placeSuffix = tFallback("placeSuffix", {
    placeIn: formatPlacePreposition(place, "", locale, false),
  });
  const titleSuffix =
    place === "catalunya" ? tFallback("catalunyaSuffix") : placeSuffix;
  const descriptionSuffix = place === "catalunya" ? "" : placeSuffix;

  return {
    placeTypeLabel: fallbackPlaceTypeLabel,
    pageData: {
      title: tFallback("title", { suffix: titleSuffix }),
      subTitle: tFallback("subTitle", { suffix: descriptionSuffix }),
      metaTitle: tFallback("metaTitle", { suffix: titleSuffix }),
      metaDescription: tFallback("metaDescription", {
        suffix: descriptionSuffix,
      }),
      canonical,
      notFoundTitle: tFallback("notFoundTitle"),
      notFoundDescription,
    },
  };
}

export async function buildPlaceEventsPromise({
  place,
  locale = DEFAULT_LOCALE,
}: {
  place: string;
  locale?: AppLocale;
}): Promise<PlacePageEventsResult> {
  // Only needed after the events arrive, so don't hold the events fetch on it.
  const placeTypeLabelPromise = getPlaceTypeAndLabelCached(place);

  // Always fetch the rich page size: the unfiltered response's totalElements
  // decides expandability, which saves a separate count call. Thin places are
  // trimmed to SSR_EVENTS_SIZE_THIN below.
  const fetchParams: FetchEventsParams = {
    page: 0,
    size: SSR_EVENTS_SIZE_EXPANDABLE,
  };

  if (place !== "catalunya") {
    fetchParams.place = place;
  }

  const { eventsResponse, events, noEventsFound } =
    await fetchEventsWithFallback({
      place,
      initialParams: fetchParams,
      fetcher: fetchEventsCached,
      regionFallback: {
        size: 7,
        includeCategory: false,
        includeDateRange: true,
      },
      finalFallback: {
        size: 7,
        includeCategory: false,
        includeDateRange: true,
        dateRangeFactory: twoWeeksDefault,
        place: undefined,
      },
    });
  const placeTypeLabel = await placeTypeLabelPromise;
  // An empty first page is either a real zero or an API failure (fetchEvents
  // returns an empty page for both), and eventsResponse then holds a fallback
  // total. Ask the count endpoint so failures fail open, as in the sitemap.
  const placeIsExpandable = noEventsFound
    ? await getPlaceExpandability(place, placeTypeLabel.type)
    : isExpandableByCount(
      place,
      placeTypeLabel.type,
      eventsResponse?.totalElements ?? null
    );
  const ssrPageSize = placeIsExpandable
    ? SSR_EVENTS_SIZE_EXPANDABLE
    : SSR_EVENTS_SIZE_THIN;
  const pageEvents = noEventsFound ? events : events.slice(0, ssrPageSize);
  const serverHasMore = eventsResponse
    ? !eventsResponse.last || events.length > pageEvents.length
    : false;

  const localizedEvents = addLocalizedDateFields(pageEvents, locale);
  const eventsWithAds = insertAds(localizedEvents);
  const validEvents = localizedEvents.filter(isEventSummaryResponseDTO);
  const pageUrl = toLocalizedUrl(place === "catalunya" ? "/" : `/${place}`, locale);
  const structuredScripts =
    validEvents.length > 0
      ? [
        {
          id: `events-${place}`,
          data: generateItemListStructuredData(
            validEvents,
            `Esdeveniments ${place}`,
            undefined,
            locale,
            pageUrl
          ),
        },
      ]
      : undefined;

  return {
    events: eventsWithAds,
    noEventsFound,
    serverHasMore,
    ssrPageSize,
    structuredScripts,
    placeIsExpandable,
    totalEvents: noEventsFound ? 0 : (eventsResponse?.totalElements ?? 0),
  };
}
