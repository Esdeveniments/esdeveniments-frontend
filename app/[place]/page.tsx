import { insertAds, filterPastEvents } from "@lib/api/events";
import { fetchCategories } from "@lib/api/categories";
import { getPlaceTypeAndLabelCached } from "@utils/helpers";
import { fetchEventsWithFallback } from "@lib/helpers/event-fallback";
import { generatePagesData } from "@components/partials/generatePagesData";
import { hasNewsForPlace } from "@lib/api/news";
import {
  buildPageMeta,
  generateItemListStructuredData,
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
import { redirect } from "next/navigation";
import { topStaticGenerationPlaces } from "@utils/priority-places";
import type { PlacePageEventsResult } from "types/props";

export const revalidate = 300;
// Allow dynamic params not in generateStaticParams (default behavior, explicit for clarity)
export const dynamicParams = true;
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
    currentYear: new Date().getFullYear(),
    place,
    byDate: "",
    placeTypeLabel,
  });
  return buildPageMeta({
    title: pageData.metaTitle,
    description: pageData.metaDescription,
    canonical: pageData.canonical,
  });
}

export default async function Page({
  params,
}: {
  params: Promise<PlaceStaticPathParams>;
}) {
  const { place } = await params;

  validatePlaceOrThrow(place);

  const categoriesPromise = fetchCategories().catch((error) => {
    console.error("Error fetching categories:", error);
    return [] as CategorySummaryResponseDTO[];
  });
  const hasNewsPromise = hasNewsForPlace(place).catch((error) => {
    console.error("Error checking news availability:", error);
    return false;
  });
  const placeShellDataPromise = getPlaceTypeAndLabelCached(place).then(
    async (placeTypeLabel) => ({
      placeTypeLabel,
      pageData: await generatePagesData({
        currentYear: new Date().getFullYear(),
        place,
        byDate: "",
        placeTypeLabel,
      }),
    })
  );

  const eventsPromise = buildPlaceEventsPromise({ place });

  const [{ placeTypeLabel, pageData }, categories, hasNews] = await Promise.all(
    [placeShellDataPromise, categoriesPromise, hasNewsPromise]
  );

  // Late existence check to preserve UX without creating an enumeration oracle
  if (place !== "catalunya") {
    let placeExists: boolean | undefined;
    try {
      placeExists = (await fetchPlaceBySlug(place)) !== null;
    } catch {
      // ignore transient errors
    }
    if (placeExists === false) {
      const target = buildFallbackUrlForInvalidPlace({
        rawSearchParams: {},
      });
      redirect(target);
    }
  }

  return (
    <PlacePageShell
      eventsPromise={eventsPromise}
      placeTypeLabel={placeTypeLabel}
      pageData={pageData}
      place={place}
      hasNews={hasNews}
      categories={categories}
    />
  );
}

async function buildPlaceEventsPromise({
  place,
}: {
  place: string;
}): Promise<PlacePageEventsResult> {
  const fetchParams: FetchEventsParams = {
    page: 0,
    size: 10,
  };

  if (place !== "catalunya") {
    fetchParams.place = place;
  }

  const { events, noEventsFound, serverHasMore } =
    await fetchEventsWithFallback({
      place,
      initialParams: fetchParams,
    });

  const filteredEvents = filterPastEvents(events);

  // Re-check noEventsFound after filtering past events
  // Note: The helper handles the fallback logic which sets noEventsFound=true when falling back.
  // But if we have events (from initial or fallback) and filterPastEvents removes them all,
  // we should set noEventsFound=true if it wasn't already.
  // However, the original code had a specific condition:
  // if (events.length > 0 && filteredEvents.length === 0 && !noEventsFound) { noEventsFound = true; }
  // We need to preserve this.

  let finalNoEventsFound = noEventsFound;
  if (events.length > 0 && filteredEvents.length === 0 && !finalNoEventsFound) {
    finalNoEventsFound = true;
  }

  const eventsWithAds = insertAds(filteredEvents);
  const validEvents = filteredEvents.filter(isEventSummaryResponseDTO);
  const structuredScripts =
    validEvents.length > 0
      ? [
          {
            id: `events-${place}`,
            data: generateItemListStructuredData(
              validEvents,
              `Esdeveniments ${place}`
            ),
          },
        ]
      : undefined;

  return {
    events: eventsWithAds,
    noEventsFound: finalNoEventsFound,
    serverHasMore,
    structuredScripts,
  };
}
