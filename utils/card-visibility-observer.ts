import {
  CARD_VISIBLE_RATIO,
  IMPRESSION_DEBOUNCE_MS,
  toImpressionItem,
} from "@utils/card-impressions";
import type {
  CardVisibilityCallbacks,
  ListingImpressionItem,
  ObservedCardController,
} from "types/analytics";

/**
 * Shared IntersectionObserver + MutationObserver + tab-visibility loop for
 * event grids (`[data-listing-grid] > *`) and carousels (`[data-card-carousel] > *`).
 */
export function observeCardVisibility(
  root: HTMLElement,
  selector: string,
  callbacks: CardVisibilityCallbacks,
): ObservedCardController | null {
  if (typeof IntersectionObserver === "undefined") return null;

  const seen = new Set<Element>();
  const inView = new Set<Element>();
  const itemByCard = new Map<Element, ListingImpressionItem>();
  const visibleSince = new Map<Element, number>();
  const observed = new WeakSet<Element>();
  let pendingCount = 0;
  let pendingItems: ListingImpressionItem[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const visibleCards = () =>
    [...root.querySelectorAll(selector)].filter((el) => !el.closest("[hidden]"));

  const flushImpressions = () => {
    if (pendingCount > 0 || pendingItems.length > 0) {
      const count = pendingCount;
      const items = pendingItems;
      pendingCount = 0;
      pendingItems = [];
      callbacks.onFlushImpressions(count, items, visibleCards().length);
    }
    timer = null;
  };

  const pauseCard = (card: Element, now: number) => {
    const start = visibleSince.get(card);
    if (start === undefined) return;
    visibleSince.delete(card);
    const item = itemByCard.get(card);
    if (item) callbacks.onCardDwell(item, Math.max(0, now - start));
  };

  const pauseAll = (now: number) => {
    for (const card of [...visibleSince.keys()]) pauseCard(card, now);
  };

  const markCardSeen = (card: Element, cards: Element[], now: number): number => {
    if (card.closest("[hidden]")) return 0;
    const slot = cards.indexOf(card) + 1;
    const item = slot > 0 ? toImpressionItem(card, slot) : null;
    let newlySeen = 0;
    if (!seen.has(card)) {
      seen.add(card);
      newlySeen = 1;
      if (item) pendingItems.push(item);
    }
    if (item) itemByCard.set(card, item);
    if (itemByCard.has(card) && !visibleSince.has(card)) {
      visibleSince.set(card, now);
    }
    return newlySeen;
  };

  const scheduleImpressions = (addedCount: number, cards: Element[]) => {
    if (addedCount <= 0) return;
    pendingCount += addedCount;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flushImpressions, IMPRESSION_DEBOUNCE_MS);
    callbacks.onSeenProgress?.(seen, cards);
  };

  const io = new IntersectionObserver(
    (entries) => {
      const cards = visibleCards();
      const now = performance.now();
      const tabVisible = document.visibilityState !== "hidden";
      let addedCount = 0;
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= CARD_VISIBLE_RATIO) {
          inView.add(entry.target);
          if (tabVisible) addedCount += markCardSeen(entry.target, cards, now);
        } else {
          inView.delete(entry.target);
          pauseCard(entry.target, now);
        }
      }
      scheduleImpressions(addedCount, cards);
    },
    { threshold: CARD_VISIBLE_RATIO },
  );

  const flushAll = () => {
    if (timer) clearTimeout(timer);
    flushImpressions();
    pauseAll(performance.now());
    callbacks.onFlushStops?.();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      flushAll();
      return;
    }
    const cards = visibleCards();
    const now = performance.now();
    let addedCount = 0;
    for (const card of inView) {
      addedCount += markCardSeen(card, cards, now);
    }
    scheduleImpressions(addedCount, cards);
  };

  const reconcileDom = () => {
    const now = performance.now();
    for (const card of [...visibleSince.keys()]) {
      if (!card.isConnected || card.closest("[hidden]")) {
        inView.delete(card);
        pauseCard(card, now);
      }
    }
    for (const card of root.querySelectorAll(selector)) {
      if (!observed.has(card)) {
        observed.add(card);
        io.observe(card);
      }
    }
  };

  reconcileDom();
  const mo = new MutationObserver(reconcileDom);
  mo.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden"],
  });
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", flushAll);

  return {
    pauseAll,
    disconnect: () => {
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flushAll);
      flushAll();
    },
  };
}
