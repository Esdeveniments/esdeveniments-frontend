"use client";

import { useMemo } from "react";
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

  const { events, hasMore, loadMore, isLoading, isValidating } = useEvents({
    place,
    category,
    date,
    initialSize: 10,
    fallbackData: realInitial,
    serverHasMore: true,
  });

  return (
    <div className="container mt-8">
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
        isLoading={isLoading}
        isValidating={isValidating}
        hasMore={hasMore}
      />
    </div>
  );
}
