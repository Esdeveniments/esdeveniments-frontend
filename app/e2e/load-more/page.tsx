import type { Metadata } from "next";
import { Suspense } from "react";
import { ListEvent, EventSummaryResponseDTO } from "types/api/event";
import ClientTest from "./ClientTest";

export const metadata: Metadata = {
  title: "E2E Load More Test",
  description:
    "Entorn intern per validar la càrrega infinita de resultats durant els tests E2E.",
  robots: "noindex, nofollow",
};

function makeEvent(
  id: string,
  title: string,
  slug: string
): EventSummaryResponseDTO {
  return {
    id,
    hash: `hash-${id}`,
    slug,
    title,
    type: "FREE",
    url: `https://example.com/${slug}`,
    description: "Event description",
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
    region: {
      id: 1,
      name: "Barcelona",
      slug: "barcelona",
    },
    province: {
      id: 1,
      name: "Barcelona",
      slug: "barcelona",
    },
    categories: [],
  };
}

export default function Page() {
  // E2E test page: keep accessible during dev to simplify test runs

  const initialEvents: ListEvent[] = [
    makeEvent("1", "Initial Event 1", "e1"),
    makeEvent("2", "Initial Event 2", "e2"),
  ];

  return (
    <Suspense fallback={<div data-testid="loading">Loading...</div>}>
      <ClientTest
        initialEvents={initialEvents as EventSummaryResponseDTO[]}
        place="catalunya"
      />
    </Suspense>
  );
}
