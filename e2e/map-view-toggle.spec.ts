import { test, expect } from "@playwright/test";

const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axY9k0AAAAASUVORK5CYII=";

async function mockMapNetwork(page: any) {
  // Avoid external tile network flakiness
  await page.route(/https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/, async (route: any) => {
    return route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(TRANSPARENT_PNG_BASE64, "base64"),
    });
  });

  // Avoid real geocoding
  await page.route(/\/api\/geocode\?.*/, async (route: any) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ lat: 41.390205, lon: 2.154007, displayName: "Barcelona" }),
      headers: { "cache-control": "public, max-age=86400" },
    });
  });

  // Mock events feed so the client hook is deterministic
  await page.route(/\/api\/events\?.*/, async (route: any) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        content: [
          {
            id: "m1",
            hash: "hash-m1",
            slug: "map-e1",
            title: "Map Initial Event 1",
            type: "FREE",
            url: "https://example.com/map-e1",
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
        ],
        currentPage: 0,
        pageSize: 10,
        totalElements: 1,
        totalPages: 1,
        last: true,
      }),
    });
  });
}

test.describe("Map view toggle", () => {
  test("toggles map mode and hides SSR list", async ({ page }) => {
    await mockMapNetwork(page);

    // Map mode via URL
    await page.goto("/e2e/map-view?view=map", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("events-map")).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-ssr-list-wrapper][aria-hidden="true"]')).toBeAttached();

    // List mode via URL
    await page.goto("/e2e/map-view", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-ssr-list-wrapper][aria-hidden="true"]')).toHaveCount(0);
  });
});
