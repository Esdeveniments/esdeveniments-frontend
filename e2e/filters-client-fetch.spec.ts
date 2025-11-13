import { test, expect } from "@playwright/test";

test.describe("Client-side filters fetch & SSR list hiding", () => {
  test("search filter: sends term=cardedeu and hides SSR list", async ({ page }) => {
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
              startDate: "2025-01-01",
              startTime: null,
              endDate: "2025-01-01",
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

    await page.goto("/catalunya?search=cardedeu", { waitUntil: "domcontentloaded" });

    // SSR list should be hidden for filtered views
    const ssrWrapper = page.locator('[data-ssr-list-wrapper]');
    await expect(ssrWrapper).toHaveAttribute("aria-hidden", "true");

    // Client list should render filtered item (anchor to event detail)
    await expect(page.locator('a[href="/e/cardedeu-event-1"]').first()).toBeVisible();
  });

  test("location filter: sends radius/lat/lon and renders results", async ({ page }) => {
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
              startDate: "2025-02-02",
              startTime: null,
              endDate: "2025-02-02",
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

    await page.goto(
      "/catalunya?distance=28&lat=41.64316093283837&lon=2.35626369524859",
      { waitUntil: "domcontentloaded" }
    );

    // SSR list hidden and filtered item visible
    await expect(page.locator('[data-ssr-list-wrapper]')).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator('a[href="/e/geo-event-1"]').first()).toBeVisible();
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
