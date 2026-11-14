import type { PostPublishUpsellRecord } from "types/event";
import {
  POST_PUBLISH_UPSELL_STORAGE_PREFIX,
  POST_PUBLISH_UPSELL_TTL_MS,
  PUBLISH_DRAFT_MAX_CLOCK_SKEW_MS,
} from "./constants";

const storageKey = (slug: string): string =>
  `${POST_PUBLISH_UPSELL_STORAGE_PREFIX}${slug}`;

function isValidRecord(
  raw: unknown,
  slug: string,
  ownerId: string,
  now: number,
): raw is PostPublishUpsellRecord {
  if (!raw || typeof raw !== "object") return false;
  const record = raw as Partial<PostPublishUpsellRecord>;
  return (
    record.slug === slug &&
    record.ownerId === ownerId &&
    typeof record.createdAt === "number" &&
    Number.isFinite(record.createdAt) &&
    now - record.createdAt < POST_PUBLISH_UPSELL_TTL_MS &&
    record.createdAt <= now + PUBLISH_DRAFT_MAX_CLOCK_SKEW_MS
  );
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
  const record: PostPublishUpsellRecord = {
    slug,
    ownerId,
    createdAt: Date.now(),
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
    if (isValidRecord(parsed, slug, ownerId, Date.now())) {
      return true;
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
