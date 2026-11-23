"use client";

import { useEffect, useRef } from "react";
import { sendGoogleEvent } from "@utils/analytics";
import { omitDefaultFilterValue } from "@utils/constants";
import {
  compactAnalyticsParams,
  computeCardStops,
  selectTopCardStops,
  sendCardStops,
  sendItemListImpressions,
} from "@utils/card-impressions";
import { observeCardVisibility } from "@utils/card-visibility-observer";
import type { ListingImpressionItem } from "types/analytics";

function buildListingParams(context: {
  place?: string;
  category?: string;
  date?: string;
}): Record<string, string> {
  const category = omitDefaultFilterValue(context.category);
  const date = omitDefaultFilterValue(context.date);
  return compactAnalyticsParams({
    place: context.place,
    place_slug: context.place,
    category,
    category_slug: category,
    date,
  });
}

/**
 * Tracks listing page analytics:
 * 1. Card impressions (2s batch): `card_impression_batch` + `view_item_list`
 * 2. Scroll depth (25/50/75/100%) derived from unique cards seen
 * 3. Card stops (`card_stop` on hide/unmount) relative to visitor median
 */
export default function useListingAnalytics(
  root: HTMLElement | null,
  context: { place?: string; category?: string; date?: string },
): void {
  const contextRef = useRef(context);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    if (!root) return;

    const milestonesHit = new Set<number>();
    const dwellByEventId = new Map<
      string,
      { item: ListingImpressionItem; dwellMs: number }
    >();
    const reportedStopIds = new Set<string>();
    const cappedDwellById = new Map<string, number>();

    const controller = observeCardVisibility(
      root,
      "[data-listing-grid] > :not([data-listing-slot])",
      {
      onSeenProgress: (seen, cards) => {
        if (cards.length === 0) return;
        const pctSeen =
          (cards.filter((card) => seen.has(card)).length / cards.length) * 100;
        for (const milestone of [25, 50, 75, 100]) {
          if (pctSeen >= milestone && !milestonesHit.has(milestone)) {
            milestonesHit.add(milestone);
            sendGoogleEvent("listing_scroll_depth", {
              depth: milestone,
              total_cards: cards.length,
              ...buildListingParams(contextRef.current),
            });
          }
        }
      },
      onFlushImpressions: (seenCount, items, totalCards) => {
        const params = buildListingParams(contextRef.current);
        if (seenCount > 0) {
          sendGoogleEvent("card_impression_batch", {
            visible_cards: seenCount,
            total_cards: totalCards,
            context: "listing",
            ...params,
          });
        }
        if (items.length > 0) {
          sendItemListImpressions("listing", items, params);
        }
      },
      onCardDwell: (item, elapsedMs) => {
        const prev = dwellByEventId.get(item.item_id);
        if (elapsedMs <= 0 && !prev) return;
        dwellByEventId.set(item.item_id, {
          item,
          dwellMs: (prev?.dwellMs ?? 0) + elapsedMs,
        });
      },
      onFlushStops: () => {
        const samples = [...dwellByEventId.values()];
        // Top 10 stops are marked reported; capped-out stops compete again only
        // after accruing more dwell (`selectTopCardStops`).
        const stops = selectTopCardStops(
          computeCardStops(samples, reportedStopIds),
          reportedStopIds,
          cappedDwellById,
        );
        if (stops.length === 0) return;
        sendCardStops(
          "listing",
          stops,
          samples.length,
          buildListingParams(contextRef.current),
        );
      },
    });

    return () => controller?.disconnect();
  }, [root]);
}
