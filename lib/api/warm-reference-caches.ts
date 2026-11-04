import { warmCategoriesCache } from "./categories";
import { warmRegionsWithCitiesCache } from "./regions";

/**
 * Fill the reference caches every town page waits on (categories, regions
 * with cities) when the server starts, so the first visitors after a deploy
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
      Promise.allSettled([warmCategoriesCache(), warmRegionsWithCitiesCache()]),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}
