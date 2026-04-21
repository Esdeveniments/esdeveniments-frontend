import { Suspense } from "react";
import { insertAds } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { fetchEventsWithFallback } from "@lib/helpers/event-fallback";
import { generatePagesData } from "@components/partials/generatePagesData";
import {
  buildPageMeta,
  generateItemListStructuredData,
  generateWebPageSchema,
} from "@components/partials/seo-meta";
import type {
  PlaceStaticPathParams,
  PlaceTypeAndLabel,
  PageData,
} from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import type { FetchEventsParams } from "types/event";
import PlacePageShell from "@components/partials/PlacePageShell";
import { buildFallbackUrlForInvalidPlace } from "@utils/url-filters";
import {
  validatePlaceOrThrow,
  validatePlaceForMetadata,
} from "@utils/route-validation";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import { fetchPlaceBySlug } from "@lib/api/places";
import { redirect, notFound } from "next/navigation";
import type { PlacePageEventsResult, PlaceShellData } from "types/props";
import { twoWeeksDefault } from "@lib/dates";
import { siteUrl } from "@config/index";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";
import { addLocalizedDateFields } from "@utils/mappers/event";
import { toLocalizedUrl } from "@utils/i18n-seo";
import { getPlaceAliasOrInvalidPlaceRedirectUrl } from "@utils/place-alias-or-invalid-redirect";
import PlacePageSkeleton from "@components/ui/common/skeletons/PlacePageSkeleton";

// Note: This page is fully dynamic (on-demand ISR). Server renders canonical, query-agnostic HTML.
// All query filters (search, distance, lat, lon) are handled client-side.
// No generateStaticParams — all place pages are rendered on first request and cached.

export async function generateMetadata({
  params,
}: {
  params: Promise<PlaceStaticPathParams>;
}) {
  const { place } = await params;

  const validation = validatePlaceForMetadata(place);
  if (!validation.isValid) {
    return validation.fallbackMetadata;
  }

  const localePromise = getLocaleSafely();

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabelCached(
    place
  );
  const pageData: PageData = await generatePagesData({
    place,
    byDate: "",
    placeTypeLabel,
  });
  const locale = await localePromise;
  return buildPageMeta({
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
    locale,
  });
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<PlaceStaticPathParams>;
}>) {
  // params is a Promise — awaiting it at the page level would count as
  // runtime data access outside Suspense and block the static shell.
  // Pass it down; the gate awaits it inside the Suspense boundary.
  return (
    <Suspense fallback={<PlacePageSkeleton />}>
      <PlacePageGate paramsPromise={params} />
    </Suspense>
  );
}

async function PlacePageGate({
  paramsPromise,
}: Readonly<{
  paramsPromise: Promise<PlaceStaticPathParams>;
}>) {
  // Start independent work in parallel so the gate resolves as soon as both
  // the route params and the dynamic locale are known.
  const localePromise = getLocaleSafely();
  const categoriesPromise = fetchCategories().catch((error) => {
    console.error("Error fetching categories:", error);
    return [] as CategorySummaryResponseDTO[];
  });
  const [{ place }, locale] = await Promise.all([paramsPromise, localePromise]);

  // Inside Suspense: notFound() becomes <meta name="robots" content="noindex">
  // rather than an HTTP 404. Acceptable for rare invalid-slug hits.
  try {
    validatePlaceOrThrow(place);
  } catch {
    notFound();
  }

  const placeShellDataPromise = buildPlaceShellDataPromise({
    place,
    localePromise,
  });
  const eventsPromise = buildPlaceEventsPromise({ place, locale });
  const categories = await categoriesPromise;

  // Late alias/invalid-place redirect. Because this runs inside a Suspense
  // boundary it becomes a client-side redirect rather than an HTTP 3xx — an
  // acceptable trade-off for rare alias hits that would otherwise force the
  // whole page to block the shell on a catalog fetch.
  const placeRedirectUrl = await getPlaceAliasOrInvalidPlaceRedirectUrl({
    place,
    locale,
    rawSearchParams: {},
    buildTargetPath: (alias) => `/${alias}`,
    buildFallbackUrlForInvalidPlace: () =>
      buildFallbackUrlForInvalidPlace({
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

async function buildPlaceShellDataPromise({
  place,
  localePromise,
}: {
  place: string;
  localePromise: Promise<AppLocale>;
}): Promise<PlaceShellData> {
  try {
    const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabelCached(
      place
    );
    const pageData: PageData = await generatePagesData({
      place,
      byDate: "",
      placeTypeLabel,
    });
    return { placeTypeLabel, pageData };
  } catch (error) {
    console.error("Place page: unable to build shell data", error);
    const locale = await localePromise;
    const t = await getTranslations({ locale, namespace: "App.Publish" });
    return await buildFallbackPlaceShellData(place, t("noEventsFound"));
  }
}

async function buildFallbackPlaceShellData(
  place: string,
  notFoundDescription: string
): Promise<PlaceShellData> {
  const tFallback = await getTranslations("App.PlaceFallback");
  const fallbackPlaceTypeLabel: PlaceTypeAndLabel = { type: "", label: place };
  const pathSegment = place === "catalunya" ? "" : `/${place}`;
  const canonical = `${siteUrl}${pathSegment}`;
  const titleSuffix =
    place === "catalunya"
      ? tFallback("catalunyaSuffix")
      : tFallback("placeSuffix", { place });
  const descriptionSuffix =
    place === "catalunya" ? "" : tFallback("placeSuffix", { place });

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
  const fetchParams: FetchEventsParams = {
    page: 0,
    size: 12,
  };

  if (place !== "catalunya") {
    fetchParams.place = place;
  }

  const { eventsResponse, events, noEventsFound } =
    await fetchEventsWithFallback({
      place,
      initialParams: fetchParams,
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
  const serverHasMore = eventsResponse ? !eventsResponse.last : false;

  const localizedEvents = addLocalizedDateFields(events, locale);
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
    structuredScripts,
  };
}
