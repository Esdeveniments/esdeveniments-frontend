import { Suspense } from "react";
import HybridEventsList from "@components/ui/hybridEventsList";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";
import JsonLdServer from "./JsonLdServer";
import type { PlacePageShellProps } from "types/props";

export default function PlacePageShell({
  scripts = [],
  eventsPromise,
  placeTypeLabel,
  pageData,
  place,
  category,
  date,
  hasNews = false,
  categories = [],
}: PlacePageShellProps) {
  return (
    <>
      {scripts.map((s) => (
        <JsonLdServer key={s.id} id={s.id} data={s.data} />
      ))}

      <Suspense fallback={<EventsSectionFallback />}>
        <PlaceEventsSection
          eventsPromise={eventsPromise}
          placeTypeLabel={placeTypeLabel}
          pageData={pageData}
          place={place}
          category={category}
          date={date}
          hasNews={hasNews}
          categories={categories}
        />
      </Suspense>

      <ClientInteractiveLayer
        categories={categories}
        placeTypeLabel={placeTypeLabel}
      />
    </>
  );
}

async function PlaceEventsSection({
  eventsPromise,
  placeTypeLabel,
  pageData,
  place,
  category,
  date,
  hasNews,
  categories = [],
}: Pick<
  PlacePageShellProps,
  | "eventsPromise"
  | "placeTypeLabel"
  | "pageData"
  | "place"
  | "category"
  | "date"
  | "hasNews"
  | "categories"
>) {
  const { events, noEventsFound, serverHasMore, structuredScripts } =
    await eventsPromise;

  return (
    <>
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

function EventsSectionFallback() {
  return (
    <div className="container flex flex-col gap-4 mt-sticky-offset" data-testid="events-list-fallback">
      <div className="h-8 w-2/3 rounded-lg bg-muted animate-pulse" />
      <div className="h-5 w-1/2 rounded-lg bg-muted animate-pulse" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-28 w-full rounded-2xl bg-muted animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
