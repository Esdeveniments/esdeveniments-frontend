import Script from "next/script";
import HybridEventsList from "@components/ui/hybridEventsList";
import ClientInteractiveLayer from "@components/ui/clientInteractiveLayer";
import type { PageData, PlaceTypeAndLabel, JsonLdScript } from "types/common";
import type { CategorySummaryResponseDTO } from "types/api/category";
import type { ListEvent } from "types/api/event";

export default function PlacePageShell({
  nonce = "",
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
  // ClientInteractiveLayer props
  categories,
}: {
  nonce?: string;
  scripts?: JsonLdScript[];
  initialEvents: ListEvent[];
  placeTypeLabel: PlaceTypeAndLabel;
  pageData: PageData;
  noEventsFound?: boolean;
  place: string;
  category?: string;
  date?: string;
  serverHasMore?: boolean;
  categories: CategorySummaryResponseDTO[];
}) {
  return (
    <>
      {scripts.map((s) => (
        <Script
          key={s.id}
          id={s.id}
          type="application/ld+json"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s.data) }}
        />
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
      />

      <ClientInteractiveLayer
        categories={categories}
        placeTypeLabel={placeTypeLabel}
      />
    </>
  );
}
