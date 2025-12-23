import type { Metadata } from "next";
import { Suspense } from "react";
import type { ListEvent, EventSummaryResponseDTO } from "types/api/event";
import ViewToggle from "@components/ui/hybridEventsList/ViewToggle";
import SsrListWrapper from "@components/ui/hybridEventsList/SsrListWrapper";
import HybridEventsListClient from "@components/ui/hybridEventsList/HybridEventsListClient";
import List from "@components/ui/list";
import Card from "@components/ui/card";

export const metadata: Metadata = {
  title: "E2E Map View Test",
  description: "Entorn intern per validar el mode mapa i regressions relacionades.",
  robots: "noindex, nofollow",
};

function makeEvent(id: string, title: string, slug: string): EventSummaryResponseDTO {
  return {
    id,
    hash: `hash-${id}`,
    slug,
    title,
    type: "FREE",
    url: `https://example.com/${slug}`,
    description: "",
    imageUrl: "",
    startDate: "2025-01-01",
    startTime: null,
    endDate: "2025-01-01",
    endTime: null,
    location: "Barcelona",
    visits: 0,
    origin: "MANUAL",
    city: {
      id: 1,
      name: "Barcelona",
      slug: "barcelona",
      latitude: 41.3851,
      longitude: 2.1734,
      postalCode: "08001",
      rssFeed: null,
      enabled: true,
    },
    region: { id: 1, name: "Barcelona", slug: "barcelona" },
    province: { id: 1, name: "Barcelona", slug: "barcelona" },
    categories: [],
  };
}

export default function Page() {
  const initialEvents: ListEvent[] = [
    makeEvent("m1", "Map Initial Event 1", "map-e1"),
    makeEvent("m2", "Map Initial Event 2", "map-e2"),
  ];

  return (
    <div className="container pt-[6rem]" data-testid="map-view-e2e">
      <Suspense fallback={null}>
        <ViewToggle />
      </Suspense>

      <Suspense
        fallback={
          <div data-ssr-list-wrapper>
            <List events={initialEvents}>
              {(event: ListEvent, index: number) => (
                <Card key={`${event.id}-${index}`} event={event} isPriority={index === 0} />
              )}
            </List>
          </div>
        }
      >
        <SsrListWrapper categories={[]}>
          <List events={initialEvents}>
            {(event: ListEvent, index: number) => (
              <Card key={`${event.id}-${index}`} event={event} isPriority={index === 0} />
            )}
          </List>
        </SsrListWrapper>
      </Suspense>

      <HybridEventsListClient
        initialEvents={initialEvents}
        place="catalunya"
        serverHasMore={true}
        categories={[]}
      />
    </div>
  );
}
