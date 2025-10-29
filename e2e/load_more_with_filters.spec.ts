import { test, expect } from "@playwright/test";

test.describe("Load more with filters via proxy", () => {
  test("appends pages and hides button when last", async ({ page }) => {
    test.setTimeout(45000);
    // Intercept client calls to the internal proxy
    await page.route(/\/api\/events\?.*/, async (route) => {
      const url = new URL(route.request().url());
      const pageParam = url.searchParams.get("page");

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
            totalElements: 4,
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
            totalPages: 3,
            last: true,
          }),
        });
      }
      // Default for unexpected
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [],
          currentPage: 0,
          pageSize: 10,
          totalElements: 0,
          totalPages: 0,
          last: true,
        }),
      });
    });

    await page.goto("/e2e/load-more", { waitUntil: "domcontentloaded" });
    // Load more should be available initially
    await expect(page.getByTestId("hasMore")).toHaveText("true");
    const loadMore = page.getByTestId("load-more-button");
    await expect(loadMore).toBeVisible();

    // First click fetches page=1 and shows events 3 & 4
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/events") && res.url().includes("page=1")),
      loadMore.click(),
    ]);
    await expect(page.getByTestId("appended-list")).toContainText("E2E Event 3");
    await expect(page.getByTestId("appended-list")).toContainText("E2E Event 4");

    // Second click fetches page=2 and shows event 5, then button disappears
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/events") && res.url().includes("page=2")),
      loadMore.click(),
    ]);
    // Ensure the last page item appears and button disappears
    await expect(page.getByRole("button", { name: "Carregar més" })).toHaveCount(0);
  });
});
