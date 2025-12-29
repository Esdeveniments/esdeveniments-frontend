import { test, expect } from "@playwright/test";

const getFutureDate = (daysAhead: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split("T")[0];
};

// Note: Service workers are blocked globally via playwright.config.ts (serviceWorkers: 'block')
// This allows Playwright's route handlers to intercept API requests for mocking

test.describe("Client-side filters fetch & SSR list hiding", () => {
  test("search filter: sends term=cardedeu and hides SSR list", async ({ page }) => {
    const searchEventDate = getFutureDate(30);
    // Intercept client calls to the internal proxy and assert term
    await page.route(/\/api\/events\?.*/, async (route) => {
      const url = new URL(route.request().url());
      const term = url.searchParams.get("term");
      const pageParam = url.searchParams.get("page");
      expect(term).toBe("cardedeu");
      expect(pageParam).toBe("0");

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [
            {
              id: "s1",
              hash: "hash-s1",
              slug: "cardedeu-event-1",
              title: "Concert a Cardedeu",
              type: "FREE",
              url: "https://example.com/cardedeu-1",
              description: "",
              imageUrl: "",
              startDate: searchEventDate,
              startTime: null,
              endDate: searchEventDate,
              endTime: null,
              location: "Cardedeu",
              visits: 0,
              origin: "MANUAL",
              city: { id: 1, name: "Cardedeu", slug: "cardedeu", latitude: 41.6, longitude: 2.35, postalCode: "", rssFeed: null, enabled: true },
              region: { id: 1, name: "Barcelona", slug: "barcelona" },
              province: { id: 1, name: "Barcelona", slug: "barcelona" },
              categories: [],
            },
          ],
          currentPage: 0,
          pageSize: 10,
          totalElements: 1,
          totalPages: 1,
          last: true,
        }),
      });
    });

    // Wait for the API route to be called (confirms client component is fetching)
    // This ensures HybridEventsListClient has hydrated and detected the filters
    const routePromise = page.waitForRequest(/\/api\/events\?.*term=cardedeu/);
    
    await page.goto("/catalunya?search=cardedeu", { waitUntil: "domcontentloaded" });

    // Wait for the API request to be made
    await routePromise;

    // Wait for client-side filtered events to appear (confirms client component has rendered the results)
    await expect(page.locator('a[href="/e/cardedeu-event-1"]').first()).toBeVisible({ timeout: 15000 });

    // SSR list should be hidden for filtered views
    // The SsrListWrapper is inside Suspense and uses useSearchParams(), which can suspend
    // The fallback has data-ssr-list-wrapper but no aria-hidden, so we wait for the actual component
    // We check for the element that has BOTH data-ssr-list-wrapper AND aria-hidden="true"
    await expect(
      page.locator('[data-ssr-list-wrapper][aria-hidden="true"]')
    ).toBeAttached({ timeout: 10000 });
  });

  test("location filter: sends radius/lat/lon and renders results", async ({ page }) => {
    const geoEventDate = getFutureDate(45);
    // Intercept client calls to the internal proxy and assert location params
    await page.route(/\/api\/events\?.*/, async (route) => {
      const url = new URL(route.request().url());
      const radius = url.searchParams.get("radius");
      const lat = url.searchParams.get("lat");
      const lon = url.searchParams.get("lon");
      expect(radius).not.toBeNull();
      expect(lat).toBe("41.64316093283837");
      expect(lon).toBe("2.35626369524859");

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [
            {
              id: "g1",
              hash: "hash-g1",
              slug: "geo-event-1",
              title: "Fira Local",
              type: "FREE",
              url: "https://example.com/geo-1",
              description: "",
              imageUrl: "",
              startDate: geoEventDate,
              startTime: null,
              endDate: geoEventDate,
              endTime: null,
              location: "Vallès Oriental",
              visits: 0,
              origin: "MANUAL",
              city: { id: 2, name: "Granollers", slug: "granollers", latitude: 41.6, longitude: 2.35, postalCode: "", rssFeed: null, enabled: true },
              region: { id: 1, name: "Barcelona", slug: "barcelona" },
              province: { id: 1, name: "Barcelona", slug: "barcelona" },
              categories: [],
            },
          ],
          currentPage: 0,
          pageSize: 10,
          totalElements: 1,
          totalPages: 1,
          last: true,
        }),
      });
    });

    // Wait for the API route to be called (confirms client component is fetching)
    // This ensures HybridEventsListClient has hydrated and detected the filters
    const routePromise = page.waitForRequest(/\/api\/events\?.*lat=41\.64316093283837/);
    
    await page.goto(
      "/catalunya?distance=28&lat=41.64316093283837&lon=2.35626369524859",
      { waitUntil: "domcontentloaded" }
    );

    // Wait for the API request to be made
    await routePromise;

    // Wait for client-side filtered events to appear (confirms client component has rendered the results)
    await expect(page.locator('a[href="/e/geo-event-1"]').first()).toBeVisible({ timeout: 15000 });

    // SSR list hidden and filtered item visible
    // The SsrListWrapper is inside Suspense and uses useSearchParams(), which can suspend
    // The fallback has data-ssr-list-wrapper but no aria-hidden, so we wait for the actual component
    // We check for the element that has BOTH data-ssr-list-wrapper AND aria-hidden="true"
    await expect(
      page.locator('[data-ssr-list-wrapper][aria-hidden="true"]')
    ).toBeAttached({ timeout: 10000 });
  });

  test("base route: avoids immediate client refetch on mount", async ({ page }) => {
    let eventsCalls = 0;
    await page.route(/\/api\/events\?.*/, async (route) => {
      eventsCalls += 1;
      // Allow request to continue to avoid blocking if any
      await route.continue();
    });

    await page.goto("/catalunya", { waitUntil: "domcontentloaded" });

    // Give a short window for any eager fetch; expect zero or minimal calls
    await page.waitForTimeout(800);
    expect(eventsCalls).toBeLessThanOrEqual(1);
  });
});
