import { ReactElement } from "react";
import dynamic from "next/dynamic";
import ServerEventsCategorized from "@components/ui/serverEventsCategorized";
import ServerEventsList from "@components/ui/serverEventsList";
import { ServerEventsDisplayProps } from "types/props";

const HybridEventsList = dynamic(
  () => import("@components/ui/hybridEventsList"),
  {
    loading: () => null,
  }
);

export default function ServerEventsDisplay({
  categorizedEvents,
  events,
  placeTypeLabel,
  noEventsFound = false,
  hasServerFilters = false,
  place,
  category,
  date,
  serverHasMore = false,
  pageData,
  categories,
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
        serverHasMore={serverHasMore}
      />
    );
  }

  // if (shouldShowEventsList) {
  //   // Fallback to server-only list
  //   return (
  //     <ServerEventsList
  //       events={events || []}
  //       placeTypeLabel={placeTypeLabel}
  //       pageData={pageData}
  //       noEventsFound={noEventsFound}
  //     />
  //   );
  // }

  return (
    <ServerEventsCategorized
      categorizedEvents={categorizedEvents || {}}
      pageData={pageData}
      categories={categories}
    />
  );
}
