import { ReactElement } from "react";
import dynamic from "next/dynamic";
import ServerEventsCategorized from "@components/ui/serverEventsCategorized";
import ServerEventsList from "@components/ui/serverEventsList";
import { ListEvent } from "types/api/event";
import { PageData, PlaceTypeAndLabel } from "types/common";

const HybridEventsList = dynamic(
  () => import("@components/ui/hybridEventsList"),
  {
    loading: () => null,
  }
);

interface ServerEventsDisplayProps {
  // For categorized events (home page)
  categorizedEvents?: Record<string, ListEvent[]>;

  // For filtered events (place pages)
  events?: ListEvent[];
  placeTypeLabel?: PlaceTypeAndLabel;
  noEventsFound?: boolean;
  hasServerFilters?: boolean;

  // For hybrid pagination (place pages)
  place?: string;
  category?: string;
  date?: string;
  totalServerEvents?: number; // Total number of events from server for pagination

  // Common props
  pageData: PageData;
}

export default function ServerEventsDisplay({
  categorizedEvents,
  events,
  placeTypeLabel,
  noEventsFound = false,
  hasServerFilters = false,
  place,
  category,
  date,
  totalServerEvents = 0,
  pageData,
}: ServerEventsDisplayProps): ReactElement {
  // Determine which component to render based on props
  const shouldShowEventsList = hasServerFilters || events;

  if (shouldShowEventsList && place) {
    // Use hybrid approach for place pages with pagination
    return (
      <HybridEventsList
        initialEvents={events || []}
        placeTypeLabel={placeTypeLabel}
        pageData={pageData}
        noEventsFound={noEventsFound}
        place={place}
        category={category}
        date={date}
        totalServerEvents={totalServerEvents}
      />
    );
  }

  if (shouldShowEventsList) {
    // Fallback to server-only list
    return (
      <ServerEventsList
        events={events || []}
        placeTypeLabel={placeTypeLabel}
        pageData={pageData}
        noEventsFound={noEventsFound}
      />
    );
  }

  return (
    <ServerEventsCategorized
      categorizedEvents={categorizedEvents || {}}
      pageData={pageData}
    />
  );
}
