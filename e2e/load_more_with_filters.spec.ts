import { test, expect } from "@playwright/test";

// Note: Service workers are blocked globally via playwright.config.ts (serviceWorkers: 'block')
// This allows Playwright's route handlers to intercept API requests for mocking

test.describe("Load more with filters via proxy", () => {
  test("appends pages and hides button when last", async ({ page }) => {
    test.setTimeout(45000);
    // Intercept client calls to the internal proxy
    await page.route(/\/api\/events/, async (route) => {
      const url = new URL(route.request().url());
      const pageParam = url.searchParams.get("page");

      // Mock page 0 to match the test page's initial events
      if (pageParam === "0" || !pageParam) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            content: [
              {
                id: "1",
                hash: "hash-1",
                slug: "e1",
                title: "Initial Event 1",
                type: "FREE",
                url: "https://example.com/e1",
                description: "Event description",
                imageUrl: "",
                startDate: "2025-01-01",
                startTime: null,
                endDate: "2025-01-01",
                endTime: null,
                location: "Barcelona",
                visits: 0,
                origin: "MANUAL",
                city: {
                  id: 1,
                  name: "Barcelona",
                  slug: "barcelona",
                  latitude: 41.3851,
                  longitude: 2.1734,
                  postalCode: "08001",
                  rssFeed: null,
                  enabled: true,
                },
                region: { id: 1, name: "Barcelona", slug: "barcelona" },
                province: { id: 1, name: "Barcelona", slug: "barcelona" },
                categories: [],
              },
              {
                id: "2",
                hash: "hash-2",
                slug: "e2",
                title: "Initial Event 2",
                type: "FREE",
                url: "https://example.com/e2",
                description: "Event description",
                imageUrl: "",
                startDate: "2025-01-01",
                startTime: null,
                endDate: "2025-01-01",
                endTime: null,
                location: "Barcelona",
                visits: 0,
                origin: "MANUAL",
                city: {
                  id: 1,
                  name: "Barcelona",
                  slug: "barcelona",
                  latitude: 41.3851,
                  longitude: 2.1734,
                  postalCode: "08001",
                  rssFeed: null,
                  enabled: true,
                },
                region: { id: 1, name: "Barcelona", slug: "barcelona" },
                province: { id: 1, name: "Barcelona", slug: "barcelona" },
                categories: [],
              },
            ],
            currentPage: 0,
            pageSize: 10,
            totalElements: 5,
            totalPages: 3,
            last: false,
          }),
        });
      }

      if (pageParam === "1") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            content: [
              {
                id: "3",
                hash: "hash-3",
                slug: "e3",
                title: "E2E Event 3",
                type: "FREE",
                url: "https://example.com/e3",
                description: "",
                imageUrl: "",
                startDate: "2025-01-01",
                startTime: null,
                endDate: "2025-01-01",
                endTime: null,
                location: "Barcelona",
                visits: 0,
                origin: "MANUAL",
                city: {
                  id: 1,
                  name: "Barcelona",
                  slug: "barcelona",
                  latitude: 41.3851,
                  longitude: 2.1734,
                  postalCode: "08001",
                  rssFeed: null,
                  enabled: true,
                },
                region: { id: 1, name: "Barcelona", slug: "barcelona" },
                province: { id: 1, name: "Barcelona", slug: "barcelona" },
                categories: [],
              },
              {
                id: "4",
                hash: "hash-4",
                slug: "e4",
                title: "E2E Event 4",
                type: "FREE",
                url: "https://example.com/e4",
                description: "",
                imageUrl: "",
                startDate: "2025-01-02",
                startTime: null,
                endDate: "2025-01-02",
                endTime: null,
                location: "Barcelona",
                visits: 0,
                origin: "MANUAL",
                city: {
                  id: 1,
                  name: "Barcelona",
                  slug: "barcelona",
                  latitude: 41.3851,
                  longitude: 2.1734,
                  postalCode: "08001",
                  rssFeed: null,
                  enabled: true,
                },
                region: { id: 1, name: "Barcelona", slug: "barcelona" },
                province: { id: 1, name: "Barcelona", slug: "barcelona" },
                categories: [],
              },
            ],
            currentPage: 1,
            pageSize: 10,
            totalElements: 5,
            totalPages: 2,
            last: false,
          }),
        });
      }
      if (pageParam === "2") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            content: [
              {
                id: "5",
                hash: "hash-5",
                slug: "e5",
                title: "E2E Event 5",
                type: "FREE",
                url: "https://example.com/e5",
                description: "",
                imageUrl: "",
                startDate: "2025-01-03",
                startTime: null,
                endDate: "2025-01-03",
                endTime: null,
                location: "Barcelona",
                visits: 0,
                origin: "MANUAL",
                city: {
                  id: 1,
                  name: "Barcelona",
                  slug: "barcelona",
                  latitude: 41.3851,
                  longitude: 2.1734,
                  postalCode: "08001",
                  rssFeed: null,
                  enabled: true,
                },
                region: { id: 1, name: "Barcelona", slug: "barcelona" },
                province: { id: 1, name: "Barcelona", slug: "barcelona" },
                categories: [],
              },
            ],
            currentPage: 2,
            pageSize: 10,
            totalElements: 5,
            totalPages: 2,
            last: true,
          }),
        });
      }
      // Should not reach here, but continue just in case
      return route.continue();
    });

    await page.goto("/e2e/load-more", { waitUntil: "networkidle" });
    // Load more should be available initially
    await expect(page.getByTestId("hasMore")).toHaveText("true");
    const loadMore = page.getByTestId("load-more-button");
    await expect(loadMore).toBeVisible();

    // First click activates and fetches page=1 (fallbackData is treated as page 0)
    // Set up listener before clicking
    let page1Fetched = false;
    const responsePromise = page.waitForResponse(
      (res) => {
        if (!res.url().includes("/api/events")) return false;
        try {
          const url = new URL(res.url());
          const pageParam = url.searchParams.get("page");
          if (pageParam === "1") {
            page1Fetched = true;
            return true;
          }
        } catch {
          return false;
        }
        return false;
      },
      { timeout: 20000 }
    );
    
    await loadMore.click();
    await responsePromise;
    expect(page1Fetched).toBe(true);
    await expect(page.getByTestId("appended-list")).toContainText(
      "E2E Event 3"
    );
    await expect(page.getByTestId("appended-list")).toContainText(
      "E2E Event 4"
    );

    // Second click fetches page=2 and shows event 5, then button disappears
    const responsePromise2 = page.waitForResponse(
      (res) => {
        const url = res.url();
        return url.includes("/api/events") && url.includes("page=2");
      },
      { timeout: 15000 }
    );
    await loadMore.click();
    await responsePromise2;
    // Ensure the last page item appears
    await expect(page.getByTestId("appended-list")).toContainText(
      "E2E Event 5"
    );
    // Button should disappear when last page is reached
    await expect(
      page.getByRole("button", { name: "Carregar més" })
    ).toHaveCount(0);
  });
});
