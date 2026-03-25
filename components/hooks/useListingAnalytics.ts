"use client";

import { useEffect, useRef } from "react";
import { sendGoogleEvent } from "@utils/analytics";

/**
 * Tracks listing page analytics:
 * 1. Card impressions (batched, 2s debounce) via IntersectionObserver
 * 2. Scroll depth (25/50/75/100%) derived from unique cards seen
 *
 * Pass `container` via callback ref pattern (useState setter) so the effect
 * re-runs when the element mounts/unmounts. Uses refs for changing params
 * to avoid tearing down observers on data changes.
 *
 * Uses MutationObserver to handle dynamically added cards (load more).
 * Zero DOM manipulation — no sentinel elements or style mutations.
 */
export default function useListingAnalytics(
  container: HTMLElement | null,
  eventsCount: number,
  context: { place?: string; category?: string; date?: string },
): void {
  const eventsCountRef = useRef(eventsCount);
  const contextRef = useRef(context);

  // Keep refs in sync without re-creating observers
  useEffect(() => {
    eventsCountRef.current = eventsCount;
    contextRef.current = context;
  }, [eventsCount, context]);

  useEffect(() => {
    if (!container || typeof IntersectionObserver === "undefined") return;

    const seen = new Set<Element>();
    const milestonesHit = new Set<number>();
    let pending = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      if (pending > 0) {
        sendGoogleEvent("card_impression_batch", {
          visible_cards: pending,
          total_cards: eventsCountRef.current,
          context: "listing",
          ...contextRef.current,
        });
        pending = 0;
      }
      timer = null;
    };

    const checkScrollDepth = () => {
      const grid = container.querySelector("section");
      const total = grid?.children.length ?? 0;
      if (total === 0) return;
      const pctSeen = (seen.size / total) * 100;
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
        let n = 0;
        for (const e of entries) {
          if (e.isIntersecting && !seen.has(e.target)) {
            seen.add(e.target);
            n++;
            io.unobserve(e.target);
          }
        }
        if (n > 0) {
          pending += n;
          if (timer) clearTimeout(timer);
          timer = setTimeout(flush, 2000);
          checkScrollDepth();
        }
      },
      { threshold: 0.5 },
    );

    // Scan grid children and observe any not yet seen
    const observeNewCards = () => {
      const grid = container.querySelector("section");
      if (!grid) return;
      for (const child of grid.children) {
        if (!seen.has(child)) io.observe(child);
      }
    };

    observeNewCards();

    // MutationObserver handles load-more cards and grid replacement
    const mo = new MutationObserver(observeNewCards);
    mo.observe(container, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      if (timer) clearTimeout(timer);
      if (pending > 0) flush();
    };
  }, [container]);
}
