import { sendGoogleEvent } from "@utils/analytics";
import type { CardStopItem, ListingImpressionItem } from "types/analytics";

// GA4 takes up to 200 items per ecommerce event.
export const MAX_ITEMS_PER_EVENT = 200;
// A card counts as seen once half of it is on screen in a visible tab.
export const CARD_VISIBLE_RATIO = 0.5;
export const IMPRESSION_DEBOUNCE_MS = 2000;

// Scroll-stop baseline: require at least 4 seen event cards on the page and a
// pause well above the visitor's own median (Facebook/LinkedIn dwell rule), so
// an idle multi-column viewport without scrolling never fabricates stops.
export const MIN_CARDS_FOR_STOP_BASELINE = 4;
export const MIN_STOP_DWELL_MS = 2500;
export const STOP_MEDIAN_RATIO = 1.75;

/** Reads an event card's GA4 item fields from its title link; null for ads. */
export function toImpressionItem(
  card: Element,
  index: number,
): ListingImpressionItem | null {
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

/** Omits empty/undefined context fields so GA4 payloads stay compact. */
export function compactAnalyticsParams(
  params?: Record<string, string | undefined>,
): Record<string, string> {
  if (!params) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value) out[key] = value;
  }
  return out;
}

/** Sends seen event cards in <=200-item GA4 `view_item_list` batches. */
export function sendItemListImpressions(
  listName: string,
  items: ReadonlyArray<ListingImpressionItem>,
  params?: Record<string, string | undefined>,
): void {
  const context = compactAnalyticsParams(params);
  for (let i = 0; i < items.length; i += MAX_ITEMS_PER_EVENT) {
    sendGoogleEvent("view_item_list", {
      item_list_name: listName,
      ...context,
      items: items.slice(i, i + MAX_ITEMS_PER_EVENT),
    });
  }
}

/** Picks cards whose visible dwell beats the visitor's page median and floor. */
export function computeCardStops(
  samples: ReadonlyArray<{ item: ListingImpressionItem; dwellMs: number }>,
  alreadyReported?: ReadonlySet<string>,
): CardStopItem[] {
  if (samples.length < MIN_CARDS_FOR_STOP_BASELINE) return [];
  const sorted = samples.map((s) => s.dwellMs).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  const threshold = Math.max(MIN_STOP_DWELL_MS, median * STOP_MEDIAN_RATIO);

  const stops: CardStopItem[] = [];
  for (const { item, dwellMs } of samples) {
    if (dwellMs < threshold) continue;
    if (alreadyReported?.has(item.item_id)) continue;
    stops.push({ ...item, dwell_ms: Math.round(dwellMs) });
  }
  return stops;
}

/** Sends one batched `card_stop_batch` event (<=200 items per chunk). */
export function sendCardStopBatch(
  listName: string,
  stops: ReadonlyArray<CardStopItem>,
  totalSeen: number,
  params?: Record<string, string | undefined>,
): void {
  if (stops.length === 0) return;
  const context = compactAnalyticsParams(params);
  for (let i = 0; i < stops.length; i += MAX_ITEMS_PER_EVENT) {
    const chunk = stops.slice(i, i + MAX_ITEMS_PER_EVENT);
    sendGoogleEvent("card_stop_batch", {
      item_list_name: listName,
      visible_cards: chunk.length,
      total_cards: totalSeen,
      ...context,
      items: chunk,
    });
  }
}
