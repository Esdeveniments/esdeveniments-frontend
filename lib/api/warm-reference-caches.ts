import { warmCategoriesCache } from "./categories";
import { warmPlacesCache } from "./places";
import { warmRegionsWithCitiesCache } from "./regions";

/**
 * Fill the reference caches every listing request waits on (categories,
 * regions with cities, and the place list proxy.ts checks slugs against)
 * when the server starts, so the first visitors after a deploy
 * don't wait on the backend. Called from instrumentation.ts, which Next
 * awaits before serving requests, so the wait is capped: a slow or failing
 * backend only skips the warm-up (the external wrappers return [], which is
 * not cached) and never holds startup longer than `timeoutMs`.
 */
export async function warmReferenceCaches(timeoutMs = 3000): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  try {
    await Promise.race([
      Promise.allSettled([
        warmCategoriesCache(),
        warmRegionsWithCitiesCache(),
        warmPlacesCache(),
      ]),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}
