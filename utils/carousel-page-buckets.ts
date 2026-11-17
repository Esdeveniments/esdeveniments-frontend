import { computeCardStops, sendCardStopBatch } from "@utils/card-impressions";
import type {
  CarouselPageBucket,
  ListingImpressionItem,
} from "types/analytics";

// Keyed by the URL each carousel mounted on, not the live `window.location`:
// Next's `HistoryUpdater` calls `pushState` in `useInsertionEffect` before old
// effects unmount, so cleanup callbacks still belong to `mountHref`.
const MAX_TRACKED_PAGE_BUCKETS = 4;
const bucketsByHref = new Map<string, CarouselPageBucket>();
let pageListenersAttached = false;

export function carouselRowIdentity(
  listName: string,
  categorySlug: string | undefined,
  placeSlug: string | undefined,
): string {
  return `${listName}::${categorySlug ?? ""}::${placeSlug ?? ""}`;
}

export function getCarouselPageBucket(href: string): CarouselPageBucket {
  let bucket = bucketsByHref.get(href);
  if (!bucket) {
    if (bucketsByHref.size >= MAX_TRACKED_PAGE_BUCKETS) {
      for (const [oldHref, oldBucket] of bucketsByHref) {
        if (oldBucket.activePauseHandlers.size === 0) {
          bucketsByHref.delete(oldHref);
          break;
        }
      }
    }
    bucket = {
      seenItemIdsByList: new Map(),
      dwellPoolByKey: new Map(),
      reportedStopKeys: new Set(),
      activePauseHandlers: new Set(),
    };
    bucketsByHref.set(href, bucket);
  }
  return bucket;
}

export function deleteCarouselPageBucket(href: string): void {
  bucketsByHref.delete(href);
}

export function getCarouselSeenItemIds(href: string, rowKey: string): Set<string> {
  const bucket = getCarouselPageBucket(href);
  let set = bucket.seenItemIdsByList.get(rowKey);
  if (!set) {
    set = new Set<string>();
    bucket.seenItemIdsByList.set(rowKey, set);
  }
  return set;
}

export function recordCarouselCardDwell(
  href: string,
  listName: string,
  placeSlug: string | undefined,
  categorySlug: string | undefined,
  item: ListingImpressionItem,
  elapsedMs: number,
): void {
  const bucket = getCarouselPageBucket(href);
  const key = `${carouselRowIdentity(listName, categorySlug, placeSlug)}::${item.item_id}`;
  const prev = bucket.dwellPoolByKey.get(key);
  if (elapsedMs <= 0 && !prev) return;
  bucket.dwellPoolByKey.set(key, {
    listName,
    placeSlug,
    categorySlug,
    item,
    dwellMs: (prev?.dwellMs ?? 0) + elapsedMs,
  });
}

export function flushCarouselBucketStops(bucket: CarouselPageBucket): void {
  const now = performance.now();
  for (const pause of bucket.activePauseHandlers) pause(now);
  if (bucket.dwellPoolByKey.size === 0) return;

  const entries = [...bucket.dwellPoolByKey.entries()];
  const samples = entries.map(([key, entry]) => ({
    item: { ...entry.item, item_id: key },
    dwellMs: entry.dwellMs,
  }));
  const rawStops = computeCardStops(samples, bucket.reportedStopKeys);
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
    bucket.reportedStopKeys.add(stop.item_id);
    const entry = bucket.dwellPoolByKey.get(stop.item_id);
    if (!entry) continue;
    const groupKey = carouselRowIdentity(
      entry.listName,
      entry.categorySlug,
      entry.placeSlug,
    );
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

export function ensureCarouselStopListeners(): void {
  if (pageListenersAttached || typeof window === "undefined") return;
  pageListenersAttached = true;
  const flushAll = () => {
    for (const bucket of bucketsByHref.values()) flushCarouselBucketStops(bucket);
  };
  window.addEventListener("pagehide", flushAll);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
}

export function resetCarouselBuckets(): void {
  bucketsByHref.clear();
}
