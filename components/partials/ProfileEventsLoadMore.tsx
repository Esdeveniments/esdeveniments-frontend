"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import List from "@components/ui/list";
import Card from "@components/ui/card";
import LoadMoreButton from "@components/ui/loadMoreButton";
import { sendGoogleEvent } from "@utils/analytics";
import type { EventSummaryResponseDTO, PagedResponseDTO } from "types/api/event";
import type { ProfileEventsLoadMoreProps } from "types/props";

// Appends the profile's next pages under the server-rendered first page.
export default function ProfileEventsLoadMore({
  username,
  status,
  pageSize,
  initialIds,
}: ProfileEventsLoadMoreProps) {
  const t = useTranslations("Components.Profile");
  const [events, setEvents] = useState<EventSummaryResponseDTO[]>([]);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  const loadMore = async () => {
    setIsLoading(true);
    setFailed(false);
    sendGoogleEvent("load_more", { context: "profile_events", status, page: nextPage });
    try {
      const qs = new URLSearchParams({ status, page: String(nextPage), size: String(pageSize) });
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/events?${qs}`);
      if (!res.ok) throw new Error(`Profile events: HTTP ${res.status}`);
      const data = (await res.json()) as PagedResponseDTO<EventSummaryResponseDTO>;
      const seen = new Set([...initialIds, ...events.map((event) => event.id)]);
      const fresh = data.content.filter((event) => !seen.has(event.id));
      setEvents((prev) => [...prev, ...fresh]);
      setLoadedCount(fresh.length);
      setNextPage((page) => page + 1);
      setHasMore(!data.last && data.content.length > 0);
    } catch {
      setFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {events.length > 0 && (
        <div className="mt-5">
          <List events={events}>
            {(event) => <Card event={event} headingLevel="h2" />}
          </List>
        </div>
      )}
      {/* New cards appear above the button; tell screen reader users. */}
      <p role="status" className="sr-only">
        {loadedCount > 0 ? t("loadedCount", { count: loadedCount }) : ""}
      </p>
      {failed && (
        <p role="alert" className="body-small text-error-dark text-center mt-section-y">
          {t("loadMoreError")}
        </p>
      )}
      <LoadMoreButton onLoadMore={loadMore} hasMore={hasMore} isLoading={isLoading} />
    </>
  );
}
