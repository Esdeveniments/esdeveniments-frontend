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
export const MAX_REPORTED_STOPS = 10;

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

/**
 * Ranks eligible stops by `dwell_ms` descending, marks the top 10 as reported,
 * and records capped-out cards' dwell so they stay silent on a zero-new-dwell
 * re-hide while competing again if they later accrue more dwell.
 */
export function selectTopCardStops(
  candidates: ReadonlyArray<CardStopItem>,
  reportedIds: Set<string>,
  cappedDwellById: Map<string, number>,
): CardStopItem[] {
  const fresh = candidates.filter(
    (stop) => stop.dwell_ms > (cappedDwellById.get(stop.item_id) ?? -1),
  );
  if (fresh.length === 0) return [];
  const ranked = fresh.toSorted((a, b) => b.dwell_ms - a.dwell_ms);
  const selected = ranked.slice(0, MAX_REPORTED_STOPS);
  for (const stop of selected) {
    reportedIds.add(stop.item_id);
    cappedDwellById.delete(stop.item_id);
  }
  for (const overflow of ranked.slice(MAX_REPORTED_STOPS)) {
    cappedDwellById.set(overflow.item_id, overflow.dwell_ms);
  }
  return selected;
}

/**
 * Sends one flat `card_stop` event per stopped card.
 * GA4 BigQuery Export drops `items[]` on custom event names and caps string
 * params at 100 chars, whereas flat `event_id`, `event_category_slug`,
 * `event_place_slug`, `position`, and `dwell_ms` land intact in both GA4 and
 * BigQuery `event_params`.
 */
export function sendCardStops(
  listName: string,
  stops: ReadonlyArray<CardStopItem>,
  totalSeen: number,
  params?: Record<string, string | undefined>,
): void {
  if (stops.length === 0) return;
  const context = compactAnalyticsParams(params);
  for (const stop of stops) {
    sendGoogleEvent("card_stop", {
      item_list_name: listName,
      event_id: stop.item_id,
      ...(stop.item_category
        ? { event_category_slug: stop.item_category }
        : {}),
      ...(stop.item_category2
        ? { event_place_slug: stop.item_category2 }
        : {}),
      position: stop.index,
      dwell_ms: stop.dwell_ms,
      total_cards: totalSeen,
      ...context,
    });
  }
}
