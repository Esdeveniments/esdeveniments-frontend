import type { Page } from "@playwright/test";

/**
 * Fetch candidate event slugs from the internal API proxy (HMAC is signed
 * server-side). Returns an empty array if the API is unreachable or empty.
 */
export async function fetchEventSlugs(page: Page, size = 5): Promise<string[]> {
  const res = await page.request.get(`/api/events?size=${size}`);
  if (!res.ok()) return [];
  const data = (await res.json()) as { content?: Array<{ slug?: string }> };
  return (data?.content ?? [])
    .map((event) => event?.slug)
    .filter((slug): slug is string => typeof slug === "string" && slug.length > 0);
}

/**
 * Navigate to the detail page of the first event whose `/e/[slug]` actually
 * resolves, returning the slug used (or `null` if none of the candidates do).
 *
 * The event detail page renders the calendar button and Event JSON-LD
 * unconditionally, so the only way they go missing is a `notFound()` (a
 * CANCELLED event, or a transient cold-build SSR fetch miss). The list API can
 * surface such a slug, which made tests that blindly used `content[0].slug`
 * flaky. Trying the next candidate when a page resolves to "not found" removes
 * that dependency on which event happens to be first.
 *
 * Note: the page returns HTTP 200 even for a missing event (PPR streams a shell,
 * then the not-found boundary), so the response status can't distinguish them.
 * `NoEventFound` renders `data-testid="no-event-found"`; a real event never does.
 */
export async function gotoFirstResolvableEvent(
  page: Page,
  { localePrefix = "" }: { localePrefix?: string } = {}
): Promise<string | null> {
  const slugs = await fetchEventSlugs(page);
  for (const slug of slugs) {
    await page.goto(`${localePrefix}/e/${slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    const isNotFound = await page
      .getByTestId("no-event-found")
      .waitFor({ state: "visible", timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (!isNotFound) return slug;
  }
  return null;
}

/**
 * Wait for the `useSWR` GET `/api/favorites` that every favorite button fires
 * on mount. Resolving this response means the button has hydrated (so a click
 * won't be dropped before React attaches its handler) and SWR has settled (so a
 * late GET won't overwrite the optimistic `aria-pressed` state after a click).
 *
 * Must be called as a promise set up *before* `page.goto`, then awaited after
 * navigation — otherwise the request may fire before the listener is attached.
 * Tolerates the request having already resolved (e.g. on a retry).
 */
export function waitForFavoritesReady(page: Page): Promise<unknown> {
  return page
    .waitForResponse(
      (r) =>
        r.url().includes("/api/favorites") && r.request().method() === "GET",
      { timeout: 30000 }
    )
    .catch(() => null);
}

/**
 * Wait for the favorites mutation (`POST /api/favorites`) a toggle click fires.
 * `waitForFavoritesReady` only awaits the *first* mount GET, but SWR can fire a
 * later revalidation GET that resolves after the click and resets the optimistic
 * `aria-pressed`. Once this POST resolves, the button reflects the
 * server-authoritative list (the handler calls `mutateFavorites(..., { revalidate:
 * false })`), so no later GET can clobber it — assert `aria-pressed` after this.
 *
 * Set up as a promise *before* the click, then await it before asserting. Unlike
 * `waitForFavoritesReady` (a tolerant readiness hint), this is an assertion
 * target: it intentionally does NOT swallow a timeout, so a missing write throws
 * a descriptive Playwright timeout error instead of a cryptic downstream failure.
 */
export function waitForFavoriteWrite(page: Page) {
  return page.waitForResponse((r) => {
    const url = new URL(r.url());
    return url.pathname === "/api/favorites" && r.request().method() === "POST";
  }, { timeout: 30000 });
}
