import HybridEventsList from "@components/ui/hybridEventsList";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";
import type { PageData, PlaceTypeAndLabel, JsonLdScript } from "types/common";
import JsonLdServer from "./JsonLdServer";
import type { CategorySummaryResponseDTO } from "types/api/category";
import type { ListEvent } from "types/api/event";

export default function PlacePageShell({
  scripts = [],
  // HybridEventsList props
  initialEvents,
  placeTypeLabel,
  pageData,
  noEventsFound = false,
  place,
  category,
  date,
  serverHasMore = false,
  hasNews = false,
  // ClientInteractiveLayer props
  categories,
}: {
  scripts?: JsonLdScript[];
  initialEvents: ListEvent[];
  placeTypeLabel: PlaceTypeAndLabel;
  pageData: PageData;
  noEventsFound?: boolean;
  place: string;
  category?: string;
  date?: string;
  serverHasMore?: boolean;
  hasNews?: boolean;
  categories: CategorySummaryResponseDTO[];
}) {
  return (
    <>
      {scripts.map((s) => (
        <JsonLdServer key={s.id} id={s.id} data={s.data} />
      ))}

      <HybridEventsList
        initialEvents={initialEvents}
        placeTypeLabel={placeTypeLabel}
        pageData={pageData}
        noEventsFound={noEventsFound}
        place={place}
        category={category}
        date={date}
        serverHasMore={serverHasMore}
        hasNews={hasNews}
      />

      <ClientInteractiveLayer
        categories={categories}
        placeTypeLabel={placeTypeLabel}
      />
    </>
  );
}
