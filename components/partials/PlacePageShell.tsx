import { Suspense } from "react";
import type { JSX } from "react";
import HybridEventsList from "@components/ui/hybridEventsList";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";
import JsonLdServer from "./JsonLdServer";
import { PlacePageSkeleton } from "@components/ui/common/skeletons";
import type { PlacePageShellProps } from "types/props";

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
    <>
      {/* Suspense boundary for shell + events - streams together */}
      <Suspense fallback={<PlacePageSkeleton />}>
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

      <ClientInteractiveLayer
        categories={categories}
        placeTypeLabel={undefined} // Will be available after shell streams
      />
    </>
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

