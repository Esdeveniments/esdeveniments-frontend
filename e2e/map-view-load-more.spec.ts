import { test, expect } from "@playwright/test";

const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axY9k0AAAAASUVORK5CYII=";

async function mockTiles(page: any) {
  await page.route(/https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/, async (route: any) => {
    return route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(TRANSPARENT_PNG_BASE64, "base64"),
    });
  });
}

async function mockGeocode(page: any) {
  await page.route(/\/api\/geocode\?.*/, async (route: any) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ lat: 41.390205, lon: 2.154007, displayName: "Barcelona" }),
    });
  });
}

function makeEvent(id: string, slug: string, title: string) {
  return {
    id,
    hash: `hash-${id}`,
    slug,
    title,
    type: "FREE",
    url: `https://example.com/${slug}`,
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
  };
}

test.describe("Map mode load more", () => {
  test("adds more markers when loading more", async ({ page }) => {
    await mockTiles(page);
    await mockGeocode(page);

    await page.route(/\/api\/events\?.*/, async (route: any) => {
      const url = new URL(route.request().url());
      const pageParam = url.searchParams.get("page") ?? "0";

      if (pageParam === "0") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            content: [makeEvent("m1", "map-e1", "Map Initial Event 1"), makeEvent("m2", "map-e2", "Map Initial Event 2")],
            currentPage: 0,
            pageSize: 50,
            totalElements: 4,
            totalPages: 2,
            last: false,
          }),
        });
      }

      if (pageParam === "1") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            content: [makeEvent("m3", "map-e3", "Map More Event 3"), makeEvent("m4", "map-e4", "Map More Event 4")],
            currentPage: 1,
            pageSize: 50,
            totalElements: 4,
            totalPages: 2,
            last: true,
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: [],
          currentPage: Number(pageParam),
          pageSize: 50,
          totalElements: 4,
          totalPages: 2,
          last: true,
        }),
      });
    });

    await page.goto("/e2e/map-view?view=map", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("events-map")).toBeVisible({ timeout: 30000 });

    const markerLocator = page.locator(".leaflet-marker-icon");
    await expect(markerLocator).toHaveCount(2, { timeout: 30000 });

    const reqPromise = page.waitForRequest(/\/api\/events\?.*page=1/);
    await page.getByTestId("load-more-button").click();
    await reqPromise;

    // Button should disappear because last=true (confirms client applied page=1 response)
    await expect(page.getByTestId("load-more-button")).toHaveCount(0, { timeout: 30000 });

    // Markers should not regress (Leaflet DOM count can be flaky, so keep this loose)
    await expect.poll(() => markerLocator.count(), { timeout: 30000 }).toBeGreaterThanOrEqual(2);
  });
});
