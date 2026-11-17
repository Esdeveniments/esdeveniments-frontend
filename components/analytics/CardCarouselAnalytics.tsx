"use client";

import { useEffect, useRef } from "react";
import { sendItemListImpressions } from "@utils/card-impressions";
import { observeCardVisibility } from "@utils/card-visibility-observer";
import {
  carouselRowIdentity,
  deleteCarouselPageBucket,
  ensureCarouselStopListeners,
  flushCarouselBucketStops,
  getCarouselPageBucket,
  getCarouselSeenItemIds,
  recordCarouselCardDwell,
  resetCarouselBuckets,
} from "@utils/carousel-page-buckets";
import type { CardCarouselAnalyticsProps } from "types/props";

export const resetCarouselImpressionCache = resetCarouselBuckets;

/**
 * Observes cards inside a horizontal carousel (`[data-card-carousel] > *`) and
 * reports newly seen cards (>=50% visible in an active tab) as `view_item_list`
 * and page-pooled scroll stops as `card_stop_batch`.
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
    const mountHref = typeof window !== "undefined" ? window.location.href : "";
    const bucket = getCarouselPageBucket(mountHref);

    const controller = observeCardVisibility(root, "[data-card-carousel] > *", {
      onFlushImpressions: (_count, items) => {
        const { listName: name, placeSlug: place, categorySlug: category } =
          contextRef.current;
        const seenIds = getCarouselSeenItemIds(
          mountHref,
          carouselRowIdentity(name, category, place),
        );
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
        recordCarouselCardDwell(mountHref, name, place, category, item, elapsedMs);
      },
    });
    if (!controller) return;
    bucket.activePauseHandlers.add(controller.pauseAll);

    return () => {
      controller.disconnect();
      bucket.activePauseHandlers.delete(controller.pauseAll);
      if (bucket.activePauseHandlers.size === 0) {
        flushCarouselBucketStops(bucket);
        const liveHref = typeof window !== "undefined" ? window.location.href : "";
        if (liveHref !== mountHref) {
          deleteCarouselPageBucket(mountHref);
        }
      }
    };
  }, []);

  return (
    <div ref={rootRef} className="w-full min-w-0">
      {children}
    </div>
  );
}
