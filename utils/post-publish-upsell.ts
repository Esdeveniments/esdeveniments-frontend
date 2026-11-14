import type { PostPublishUpsellRecord } from "types/event";
import {
  POST_PUBLISH_UPSELL_STORAGE_PREFIX,
  POST_PUBLISH_UPSELL_TTL_MS,
  PUBLISH_DRAFT_MAX_CLOCK_SKEW_MS,
} from "./constants";

const storageKey = (slug: string): string =>
  `${POST_PUBLISH_UPSELL_STORAGE_PREFIX}${slug}`;

function isFreshTimestamp(createdAt: unknown, now: number): createdAt is number {
  return (
    typeof createdAt === "number" &&
    Number.isFinite(createdAt) &&
    now - createdAt < POST_PUBLISH_UPSELL_TTL_MS &&
    createdAt <= now + PUBLISH_DRAFT_MAX_CLOCK_SKEW_MS
  );
}

function isFreshRecordForSlug(
  raw: unknown,
  slug: string,
  now: number,
): raw is PostPublishUpsellRecord {
  if (!raw || typeof raw !== "object") return false;
  const record = raw as Partial<PostPublishUpsellRecord>;
  return (
    record.slug === slug &&
    typeof record.ownerId === "string" &&
    record.ownerId.length > 0 &&
    isFreshTimestamp(record.createdAt, now)
  );
}

function pruneStaleUpsellRecords(now: number): void {
  try {
    const staleKeys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(POST_PUBLISH_UPSELL_STORAGE_PREFIX)) continue;
      const expectedSlug = key.slice(POST_PUBLISH_UPSELL_STORAGE_PREFIX.length);
      const raw = window.localStorage.getItem(key);
      if (!raw || !expectedSlug) {
        staleKeys.push(key);
        continue;
      }
      try {
        if (!isFreshRecordForSlug(JSON.parse(raw), expectedSlug, now)) {
          staleKeys.push(key);
        }
      } catch {
        staleKeys.push(key);
      }
    }
    for (const key of staleKeys) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage access errors during opportunistic pruning.
  }
}

/**
 * Persists a short-lived post-publish upsell marker for the creator so an
 * interrupted redirect or subsequent visit to the event page still shows
 * the promote/share modal once.
 */
export function savePendingPostPublishUpsell(
  slug: string,
  ownerId: string,
): void {
  if (typeof window === "undefined" || !slug || !ownerId) return;
  const now = Date.now();
  pruneStaleUpsellRecords(now);
  const record: PostPublishUpsellRecord = {
    slug,
    ownerId,
    createdAt: now,
  };
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(record));
  } catch {
    // Storage disabled (e.g. Safari private mode); ?promote=1 still covers the direct redirect.
  }
}

export function hasPendingPostPublishUpsell(
  slug: string,
  ownerId: string,
): boolean {
  if (typeof window === "undefined" || !slug || !ownerId) return false;
  const key = storageKey(slug);
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return false;
  }
  if (!raw) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isFreshRecordForSlug(parsed, slug, Date.now())) {
      return parsed.ownerId === ownerId;
    }
  } catch {
    // Fall through to remove corrupt data.
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors on cleanup.
  }
  return false;
}

export function clearPendingPostPublishUpsell(slug: string): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    window.localStorage.removeItem(storageKey(slug));
  } catch {
    // Ignore storage errors on cleanup.
  }
}
