// When an event page fails to read its event, the error page goes out under
// the 200 the shell already sent, and the CDN may keep it. For a while after
// that, proxy.ts answers event pages with a 503 instead (utils/proxy-event.ts).
// proxy.ts and the pages are separate bundles, so the time lives on
// globalThis: one value per process. performance.now() because a clock read
// in a Server Component can break the cacheComponents prerender.
const LAST_FAILURE = Symbol.for("esdeveniments.eventReadFailedAt");

export const EVENT_OUTAGE_WINDOW_MS = 60_000;

const store = globalThis as typeof globalThis & { [LAST_FAILURE]?: number };

export function markEventReadFailed(): void {
  store[LAST_FAILURE] = performance.now();
}

export function isEventReadFailing(): boolean {
  const failedAt = store[LAST_FAILURE];
  return (
    failedAt !== undefined &&
    performance.now() - failedAt < EVENT_OUTAGE_WINDOW_MS
  );
}
