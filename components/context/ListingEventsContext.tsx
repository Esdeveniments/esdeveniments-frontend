"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createExternalStore, useExternalStore } from "@lib/context/external-store";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import type { ExternalStore } from "types/common";
import type { ListingEventsState, PublishListingEventsInput } from "types/event-map";

const EMPTY: ListingEventsState = { events: [], isLoading: false };

// One store per listing, so an outgoing listing can never clear or overwrite
// the next one's events. The context value is the store itself and never
// changes; updates go through the store (see lib/context/external-store.ts).
const ListingEventsContext = createContext<ExternalStore<ListingEventsState> | null>(null);

export function ListingEventsProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createExternalStore(EMPTY));
  return <ListingEventsContext.Provider value={store}>{children}</ListingEventsContext.Provider>;
}

const fallbackStore = createExternalStore(EMPTY);

export function useListingEvents(): ListingEventsState {
  return useExternalStore(useContext(ListingEventsContext) ?? fallbackStore);
}

// Publishes the events the listing shows: SSR + appended without filters,
// the filtered results with filters, the fallback cards on zero results.
export function usePublishListingEvents({
  realInitialEvents,
  displayedEvents,
  hasClientFilters,
  showFallbackEvents,
  isLoading,
}: PublishListingEventsInput): void {
  const store = useContext(ListingEventsContext);
  const events = useMemo(() => {
    const shown = !hasClientFilters
      ? [...realInitialEvents, ...displayedEvents]
      : showFallbackEvents
        ? realInitialEvents
        : displayedEvents;
    return shown.filter(isEventSummaryResponseDTO);
  }, [realInitialEvents, displayedEvents, hasClientFilters, showFallbackEvents]);

  useEffect(() => {
    store?.set({ events, isLoading });
  }, [store, events, isLoading]);
}
