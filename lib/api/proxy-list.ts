import type { ProxyListLoader } from "types/cache";
import { createCache } from "@lib/api/cache";

// The short TTL bounds how long a backend change takes to reach Proxy.
export const PROXY_LIST_TTL_MS = 60 * 60 * 1000;
// Proxy runs before every page request; a slow backend must not delay pages.
// On timeout the page is served as before.
export const PROXY_TIMEOUT_MS = 1500;
// After a failure, skip the backend for a while so an outage doesn't add the
// timeout to every request or pile more calls onto a struggling backend.
const PROXY_BACKOFF_MS = 30 * 1000;

/**
 * A backend list for Proxy checks: cached for an hour (empty lists are not
 * cached), with a back-off window after a failure. Callers fail open.
 * globalKey shares the entry with the app's reader, so the startup warm-up
 * fills it and /api/revalidate clears it.
 */
export function createProxyListLoader<T>(
  fetchList: () => Promise<T[]>,
  { globalKey }: { globalKey?: string } = {},
): ProxyListLoader<T> {
  const { cache } = createCache<T[]>(PROXY_LIST_TTL_MS, {
    storeEmpty: false,
    globalKey,
  });
  let backoffUntil = 0;

  return {
    isBackingOff: () => Date.now() < backoffUntil,
    backOff: () => {
      backoffUntil = Date.now() + PROXY_BACKOFF_MS;
    },
    // createCache shares one fetch between concurrent misses, so the fetch
    // runs without this request's signal: Proxy stops waiting at its own
    // deadline while the fetch keeps going and fills the cache for everyone.
    // Aborting a shared fetch would hand [] to the other callers waiting on it.
    load: (signal) => {
      const deadline = new Promise<never>((_, reject) => {
        if (signal.aborted) reject(signal.reason);
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      });
      // The deadline may fire after the list arrived; nothing awaits it then.
      deadline.catch(() => {});
      return Promise.race([cache(fetchList), deadline]);
    },
  };
}
