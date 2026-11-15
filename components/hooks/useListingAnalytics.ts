"use client";

import { useEffect, useRef } from "react";
import { sendGoogleEvent } from "@utils/analytics";
import type { ListingImpressionItem } from "types/analytics";

// GA4 takes up to 200 items per event.
const MAX_ITEMS_PER_EVENT = 200;

/** The card's event, read from its title link; null for ad slots. */
function toImpressionItem(card: Element, index: number): ListingImpressionItem | null {
  const link = card.querySelector<HTMLElement>("[data-analytics-event-id]");
  const id = link?.dataset.analyticsEventId;
  if (!link || !id) return null;
  return {
    item_id: id,
    item_category: link.dataset.analyticsEventCategorySlug || undefined,
    item_category2: link.dataset.analyticsEventPlaceSlug || undefined,
    index,
  };
}

// Every event grid in the listing: the server-rendered page and the
// load-more cards. A grid hidden by client filters doesn't count.
function visibleCards(root: HTMLElement): Element[] {
  return [...root.querySelectorAll("[data-listing-grid] > *")].filter(
    (card) => !card.closest("[hidden]"),
  );
}

/**
 * Tracks listing page analytics:
 * 1. Card impressions (batched, 2s debounce) via IntersectionObserver: a count
 *    (`card_impression_batch`) and which events were seen (`view_item_list`),
 *    with each card's slot counted across the grids in `root`
 * 2. Scroll depth (25/50/75/100%) derived from unique cards seen
 *
 * `root` holds both the server-rendered grid and the load-more grid. Pass it
 * via a callback ref (useState setter) so the effect re-runs when it mounts.
 * Uses refs for changing params to avoid tearing down observers.
 *
 * Uses MutationObserver to handle dynamically added cards (load more).
 * Zero DOM manipulation — no sentinel elements or style mutations.
 */
export default function useListingAnalytics(
  root: HTMLElement | null,
  context: { place?: string; category?: string; date?: string },
): void {
  const contextRef = useRef(context);

  // Keep refs in sync without re-creating observers
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    if (!root || typeof IntersectionObserver === "undefined") return;

    const seen = new Set<Element>();
    const milestonesHit = new Set<number>();
    let pending = 0;
    let pendingItems: ListingImpressionItem[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      if (pending > 0) {
        sendGoogleEvent("card_impression_batch", {
          visible_cards: pending,
          total_cards: visibleCards(root).length,
          context: "listing",
          ...contextRef.current,
        });
        pending = 0;
      }
      for (let i = 0; i < pendingItems.length; i += MAX_ITEMS_PER_EVENT) {
        sendGoogleEvent("view_item_list", {
          item_list_name: "listing",
          ...contextRef.current,
          items: pendingItems.slice(i, i + MAX_ITEMS_PER_EVENT),
        });
      }
      pendingItems = [];
      timer = null;
    };

    const checkScrollDepth = (cards: Element[]) => {
      const total = cards.length;
      if (total === 0) return;
      const pctSeen = (cards.filter((card) => seen.has(card)).length / total) * 100;
      for (const milestone of [25, 50, 75, 100]) {
        if (pctSeen >= milestone && !milestonesHit.has(milestone)) {
          milestonesHit.add(milestone);
          sendGoogleEvent("listing_scroll_depth", {
            depth: milestone,
            total_cards: total,
            ...contextRef.current,
          });
        }
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        const cards = visibleCards(root);
        let n = 0;
        for (const e of entries) {
          if (e.isIntersecting && !seen.has(e.target)) {
            seen.add(e.target);
            n++;
            const item = toImpressionItem(e.target, cards.indexOf(e.target) + 1);
            if (item) pendingItems.push(item);
            io.unobserve(e.target);
          }
        }
        if (n > 0) {
          pending += n;
          if (timer) clearTimeout(timer);
          timer = setTimeout(flush, 2000);
          checkScrollDepth(cards);
        }
      },
      { threshold: 0.5 },
    );

    // Observe every grid card not yet seen (observing twice is a no-op)
    const observeNewCards = () => {
      for (const card of root.querySelectorAll("[data-listing-grid] > *")) {
        if (!seen.has(card)) io.observe(card);
      }
    };

    observeNewCards();

    // MutationObserver handles load-more cards and grid replacement
    const mo = new MutationObserver(observeNewCards);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      if (timer) clearTimeout(timer);
      flush();
    };
  }, [root]);
}
