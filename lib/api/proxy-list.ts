import type { ProxyListLoader } from "types/cache";
import { createCache } from "@lib/api/cache";

// Proxy is bundled apart from the app, so /api/revalidate can't clear these
// caches. The short TTL bounds how long a backend change takes to show.
export const PROXY_LIST_TTL_MS = 60 * 60 * 1000;
// Proxy runs before every page request; a slow backend must not delay pages.
// On timeout the page is served as before.
export const PROXY_TIMEOUT_MS = 1500;
// After a failure, skip the backend for a while so an outage doesn't add the
// timeout to every request or pile more calls onto a struggling backend.
const PROXY_BACKOFF_MS = 30 * 1000;

/**
 * A backend list for Proxy checks: cached for an hour (empty lists are not
 * cached), with concurrent requests on a cold process sharing one call, and
 * a back-off window after a failure. Callers fail open.
 */
export function createProxyListLoader<T>(
  fetchList: (init: Pick<RequestInit, "signal">) => Promise<T[]>,
): ProxyListLoader<T> {
  const { cache } = createCache<T[]>(PROXY_LIST_TTL_MS, { storeEmpty: false });
  let backoffUntil = 0;
  let request: Promise<T[]> | null = null;

  return {
    isBackingOff: () => Date.now() < backoffUntil,
    backOff: () => {
      backoffUntil = Date.now() + PROXY_BACKOFF_MS;
    },
    load: (signal) => {
      request ??= cache(() => fetchList({ signal })).finally(() => {
        request = null;
      });
      return request;
    },
  };
}
