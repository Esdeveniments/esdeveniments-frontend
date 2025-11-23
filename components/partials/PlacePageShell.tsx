import { Suspense } from "react";
import type { JSX } from "react";
import HybridEventsList from "@components/ui/hybridEventsList";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";
import JsonLdServer from "./JsonLdServer";
import { PlacePageSkeleton } from "@components/ui/common/skeletons";
import { FilterLoadingProvider } from "@components/context/FilterLoadingContext";
import FilterLoadingGate from "@components/ui/common/FilterLoadingGate";
import type { PlacePageShellProps } from "types/props";

export async function ClientLayerWithPlaceLabel({
  shellDataPromise,
  categories,
}: Pick<PlacePageShellProps, "shellDataPromise" | "categories">) {
  const { placeTypeLabel } = await shellDataPromise;

  return (
    <ClientInteractiveLayer categories={categories} placeTypeLabel={placeTypeLabel} />
  );
}

export default function PlacePageShell({
  eventsPromise,
  shellDataPromise,
  place,
  category,
  date,
  hasNewsPromise,
  categories = [],
  webPageSchemaFactory,
}: PlacePageShellProps) {
  return (
    <Suspense fallback={<PlacePageSkeleton />}>
      <FilterLoadingProvider>
        {/* Suspense boundary for shell + events - streams together */}
        <Suspense fallback={<PlacePageSkeleton />}>
          <FilterLoadingGate>
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
          </FilterLoadingGate>
        </Suspense>

        <Suspense fallback={null}>
          <ClientLayerWithPlaceLabel
            shellDataPromise={shellDataPromise}
            categories={categories}
          />
        </Suspense>
      </FilterLoadingProvider>
    </Suspense>
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

  // Generate webPageSchema after shell data is available
  const webPageSchema = webPageSchemaFactory
    ? webPageSchemaFactory(pageData)
    : null;

  return (
    <>
      {webPageSchema && (
        <JsonLdServer id="webpage-schema" data={webPageSchema} />
      )}

      {structuredScripts?.map((script) => (
        <JsonLdServer key={script.id} id={script.id} data={script.data} />
      ))}

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
    </>
  );
}
