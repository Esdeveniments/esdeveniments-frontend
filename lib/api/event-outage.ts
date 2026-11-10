// When an event page fails to read its event, the error page goes out under
// the 200 the shell already sent, and the CDN may keep it. While event reads
// are failing, proxy.ts answers event pages with a 503 instead
// (utils/proxy-event.ts). One broken event or one bad URL must not do that to
// every event page, so it takes failures on several different slugs.
// proxy.ts and the pages are separate bundles, so the failures live on
// globalThis: one map per process. performance.now() because a clock read
// in a Server Component can break the cacheComponents prerender.
const FAILURES = Symbol.for("esdeveniments.eventReadFailures");

export const EVENT_OUTAGE_WINDOW_MS = 60_000;
export const EVENT_OUTAGE_MIN_SLUGS = 3;

const store = globalThis as typeof globalThis & {
  [FAILURES]?: Map<string, number>;
};

function failures(): Map<string, number> {
  return (store[FAILURES] ??= new Map());
}

function isRecent(failedAt: number, now: number): boolean {
  return now - failedAt < EVENT_OUTAGE_WINDOW_MS;
}

export function markEventReadFailed(slug: string): void {
  const now = performance.now();
  const map = failures();
  for (const [key, failedAt] of map) {
    if (!isRecent(failedAt, now)) map.delete(key);
  }
  map.set(slug, now);
}

export function isEventReadFailing(): boolean {
  const now = performance.now();
  let count = 0;
  for (const failedAt of failures().values()) {
    if (isRecent(failedAt, now) && ++count >= EVENT_OUTAGE_MIN_SLUGS) {
      return true;
    }
  }
  return false;
}
