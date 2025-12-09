import { Suspense } from "react";
import type { JSX } from "react";
import HybridEventsList from "@components/ui/hybridEventsList";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";
import JsonLdServer from "./JsonLdServer";
import { EventsListSkeleton } from "@components/ui/common/skeletons";
import { FilterLoadingProvider } from "@components/context/FilterLoadingContext";
import FilterLoadingGate from "@components/ui/common/FilterLoadingGate";
import ListPageFaq from "@components/ui/common/faq/ListPageFaq";
import { buildFaqJsonLd } from "@utils/helpers";
import { buildListPageFaqItems } from "@utils/list-page-faq";
import type { PlacePageShellProps } from "types/props";
import { getTranslations } from "next-intl/server";

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
  const tFilters = await getTranslations("Config.Filters");
  const tFiltersUi = await getTranslations("Components.Filters");
  const tByDates = await getTranslations("Config.ByDates");

  const filterLabels = {
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

      <Suspense fallback={null}>
        <ClientInteractiveLayer
          categories={categories}
          placeTypeLabel={placeTypeLabel}
          filterLabels={filterLabels}
        />
      </Suspense>
    </FilterLoadingProvider>
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

  return (
    <>
      {webPageSchema && (
        <JsonLdServer id="webpage-schema" data={webPageSchema} />
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

      <ListPageFaq items={faqItems} />
    </>
  );
}
