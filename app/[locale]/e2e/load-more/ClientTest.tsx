"use client";

import { useMemo } from "react";
import { useIsClient } from "@components/hooks/useIsClient";
import { useEvents } from "@components/hooks/useEvents";
import LoadMoreButton from "@components/ui/loadMoreButton";
import type { ClientTestProps } from "types/common";

export default function ClientTest({
  initialEvents,
  place,
  category,
  date,
}: ClientTestProps) {
  const realInitial = useMemo(() => initialEvents, [initialEvents]);
  // The SSR button is visible before React attaches its click handler.
  const hydrated = useIsClient();

  const { events, hasMore, loadMore, isLoadingMore } = useEvents({
    place,
    category,
    date,
    initialSize: 10,
    fallbackData: realInitial,
    serverHasMore: true,
  });

  return (
    <div
      className="container mt-8"
      data-testid="load-more-harness"
      data-hydrated={hydrated}
    >
      <div data-testid="events-count">{events.length}</div>
      <ul data-testid="initial-list">
        {initialEvents.map((e) => (
          <li key={e.id}>{e.title}</li>
        ))}
      </ul>
      <ul data-testid="appended-list">
        {events.map((e) => (
          <li key={e.id}>{e.title}</li>
        ))}
      </ul>
      <div data-testid="hasMore">{String(hasMore)}</div>
      <LoadMoreButton
        onLoadMore={loadMore}
        isLoading={isLoadingMore}
        hasMore={hasMore}
      />
    </div>
  );
}
