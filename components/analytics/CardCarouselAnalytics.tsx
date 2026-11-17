"use client";

import { useEffect, useRef } from "react";
import {
  computeCardStops,
  sendCardStopBatch,
  sendItemListImpressions,
} from "@utils/card-impressions";
import { observeCardVisibility } from "@utils/card-visibility-observer";
import type { CarouselDwellEntry, ListingImpressionItem } from "types/analytics";
import type { CardCarouselAnalyticsProps } from "types/props";

// Page-scoped state shared across carousels on the same URL:
// 1. Deduplicates `view_item_list` across Suspense fallback -> streamed swaps.
// 2. Pools card dwell across all carousels on the page (e.g. Home category
//    rows), so scrolling past several category rows and pausing on one row's
//    cards compares against the visitor's real page-wide median.
let lastHref = "";
const seenItemIdsByList = new Map<string, Set<string>>();
const dwellPoolByKey = new Map<string, CarouselDwellEntry>();
const reportedStopKeys = new Set<string>();
const activePauseHandlers = new Set<(now: number) => void>();
let pageListenersAttached = false;

function syncPageUrl(): void {
  const href = typeof window !== "undefined" ? window.location.href : "";
  if (href !== lastHref) {
    seenItemIdsByList.clear();
    dwellPoolByKey.clear();
    reportedStopKeys.clear();
    lastHref = href;
  }
}

function getSeenItemIds(listName: string): Set<string> {
  syncPageUrl();
  let set = seenItemIdsByList.get(listName);
  if (!set) {
    set = new Set<string>();
    seenItemIdsByList.set(listName, set);
  }
  return set;
}

function recordCarouselDwell(
  listName: string,
  placeSlug: string | undefined,
  categorySlug: string | undefined,
  item: ListingImpressionItem,
  elapsedMs: number,
): void {
  syncPageUrl();
  const key = `${listName}::${categorySlug ?? ""}::${placeSlug ?? ""}::${item.item_id}`;
  const prev = dwellPoolByKey.get(key);
  if (elapsedMs <= 0 && !prev) return;
  dwellPoolByKey.set(key, {
    listName,
    placeSlug,
    categorySlug,
    item,
    dwellMs: (prev?.dwellMs ?? 0) + elapsedMs,
  });
}

function flushCarouselStops(): void {
  const now = performance.now();
  for (const pause of activePauseHandlers) pause(now);
  if (dwellPoolByKey.size === 0) return;

  const entries = [...dwellPoolByKey.entries()];
  // Key each pooled entry uniquely so computeCardStops checks the page-wide
  // median while reportedStopKeys prevents duplicate emits per row.
  const samples = entries.map(([key, entry]) => ({
    item: { ...entry.item, item_id: key },
    dwellMs: entry.dwellMs,
  }));
  const rawStops = computeCardStops(samples, reportedStopKeys);
  if (rawStops.length === 0) return;

  const grouped = new Map<
    string,
    {
      listName: string;
      placeSlug?: string;
      categorySlug?: string;
      stops: Array<ListingImpressionItem & { dwell_ms: number }>;
    }
  >();

  for (const stop of rawStops) {
    reportedStopKeys.add(stop.item_id);
    const entry = dwellPoolByKey.get(stop.item_id);
    if (!entry) continue;
    const groupKey = `${entry.listName}::${entry.categorySlug ?? ""}::${entry.placeSlug ?? ""}`;
    let group = grouped.get(groupKey);
    if (!group) {
      group = {
        listName: entry.listName,
        placeSlug: entry.placeSlug,
        categorySlug: entry.categorySlug,
        stops: [],
      };
      grouped.set(groupKey, group);
    }
    group.stops.push({ ...entry.item, dwell_ms: stop.dwell_ms });
  }

  for (const group of grouped.values()) {
    sendCardStopBatch(group.listName, group.stops, entries.length, {
      place_slug: group.placeSlug,
      category_slug: group.categorySlug,
    });
  }
}

function ensureCarouselStopListeners(): void {
  if (pageListenersAttached || typeof window === "undefined") return;
  pageListenersAttached = true;
  window.addEventListener("pagehide", flushCarouselStops);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushCarouselStops();
  });
}

export function resetCarouselImpressionCache(): void {
  seenItemIdsByList.clear();
  dwellPoolByKey.clear();
  reportedStopKeys.clear();
  lastHref = "";
}

/**
 * Observes cards inside a horizontal carousel (`[data-card-carousel] > *`) and
 * reports newly seen cards (>=50% visible in an active tab) as `view_item_list`.
 */
export default function CardCarouselAnalytics({
  listName,
  placeSlug,
  categorySlug,
  children,
}: CardCarouselAnalyticsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef({ listName, placeSlug, categorySlug });

  useEffect(() => {
    contextRef.current = { listName, placeSlug, categorySlug };
  }, [listName, placeSlug, categorySlug]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    ensureCarouselStopListeners();

    const controller = observeCardVisibility(root, "[data-card-carousel] > *", {
      onFlushImpressions: (_count, items) => {
        const { listName: name, placeSlug: place, categorySlug: category } =
          contextRef.current;
        const seenIds = getSeenItemIds(name);
        const fresh = items.filter((item) => {
          if (seenIds.has(item.item_id)) return false;
          seenIds.add(item.item_id);
          return true;
        });
        if (fresh.length > 0) {
          sendItemListImpressions(name, fresh, {
            place_slug: place,
            category_slug: category,
          });
        }
      },
      onCardDwell: (item, elapsedMs) => {
        const { listName: name, placeSlug: place, categorySlug: category } =
          contextRef.current;
        recordCarouselDwell(name, place, category, item, elapsedMs);
      },
    });
    if (!controller) return;
    activePauseHandlers.add(controller.pauseAll);

    return () => {
      controller.disconnect();
      activePauseHandlers.delete(controller.pauseAll);
      if (activePauseHandlers.size === 0) flushCarouselStops();
    };
  }, []);

  return (
    <div ref={rootRef} className="w-full min-w-0">
      {children}
    </div>
  );
}
