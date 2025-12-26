import { insertAds } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { fetchEventsWithFallback } from "@lib/helpers/event-fallback";
import { generatePagesData } from "@components/partials/generatePagesData";
import { hasNewsForPlace } from "@lib/api/news";
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
import { topStaticGenerationPlaces } from "@utils/priority-places";
import type { PlacePageEventsResult } from "types/props";
import { twoWeeksDefault } from "@lib/dates";
import { siteUrl } from "@config/index";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";
import { addLocalizedDateFields } from "@utils/mappers/event";
import { toLocalizedUrl } from "@utils/i18n-seo";
import { getPlaceAliasOrInvalidPlaceRedirectUrl } from "@utils/place-alias-or-invalid-redirect";

// Note: This page is ISR-compatible. Server renders canonical, query-agnostic HTML.
// All query filters (search, distance, lat, lon) are handled client-side.

export async function generateStaticParams() {
  // Only generate static pages for top ~15 places to keep build size under 230MB
  // Each place generates ~4.6MB, so 15 places = ~69MB (within limit)
  // Other places will be generated on-demand with ISR (revalidate: 600)
  // Runtime validation (validatePlaceOrThrow) handles invalid slugs gracefully
  return topStaticGenerationPlaces.map((slug) => ({ place: slug }));
}

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

  const placeTypeLabel: PlaceTypeAndLabel = await getPlaceTypeAndLabelCached(
    place
  );
  const pageData: PageData = await generatePagesData({
    place,
    byDate: "",
    placeTypeLabel,
  });
  const locale = await getLocaleSafely();
  return buildPageMeta({
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
    locale,
  });
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<PlaceStaticPathParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { place } = await params;
  const rawSearchParams = await searchParams;
  const locale = await getLocaleSafely();

  try {
    validatePlaceOrThrow(place);
  } catch {
    notFound();
  }

  const categoriesPromise = fetchCategories().catch((error) => {
    console.error("Error fetching categories:", error);
    return [] as CategorySummaryResponseDTO[];
  });
  const hasNewsPromise = hasNewsForPlace(place).catch((error) => {
    console.error("Error checking news availability:", error);
    return false;
  });
  const placeShellDataPromise = (async () => {
    const t = await getTranslations({ locale, namespace: "App.Publish" });
    try {
      const placeTypeLabel: PlaceTypeAndLabel =
        await getPlaceTypeAndLabelCached(place);
      const pageData: PageData = await generatePagesData({
        place,
        byDate: "",
        placeTypeLabel,
      });
      return { placeTypeLabel, pageData };
    } catch (error) {
      console.error("Place page: unable to build shell data", error);
      return await buildFallbackPlaceShellData(place, t("noEventsFound"));
    }
  })();

  const eventsPromise = buildPlaceEventsPromise({ place, locale });

  // Await categories for late existence check only
  const categories = await categoriesPromise;

  // Late existence check to preserve UX without creating an enumeration oracle
  const placeRedirectUrl = await getPlaceAliasOrInvalidPlaceRedirectUrl({
    place,
    locale,
    rawSearchParams,
    buildTargetPath: (alias) => `/${alias}`,
    buildFallbackUrlForInvalidPlace: () =>
      buildFallbackUrlForInvalidPlace({
        rawSearchParams,
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
      hasNewsPromise={hasNewsPromise}
      categories={categories}
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

async function buildFallbackPlaceShellData(
  place: string,
  notFoundDescription: string
): Promise<{
  placeTypeLabel: PlaceTypeAndLabel;
  pageData: PageData;
}> {
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
    size: 10,
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
