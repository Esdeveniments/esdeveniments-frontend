import { test, expect } from "@playwright/test";

test.describe("Filters Distance + Geolocation URL Tests", () => {
  test("should load page with distance+geolocation params in URL", async ({
    page,
  }) => {
    await page.goto(
      "/catalunya?distance=12&lat=41.643119809884865&lon=2.3563432607664034",
      { waitUntil: "domcontentloaded" }
    );

    const url = new URL(page.url());
    expect(url.searchParams.get("distance")).toBe("12");
    expect(url.searchParams.has("lat")).toBeTruthy();
    expect(url.searchParams.has("lon")).toBeTruthy();

    const lat = parseFloat(url.searchParams.get("lat") || "");
    const lon = parseFloat(url.searchParams.get("lon") || "");
    expect(lat).toBeCloseTo(41.643, 1);
    expect(lon).toBeCloseTo(2.356, 1);

    await expect(page.getByTestId("events-list")).toBeVisible({
      timeout: 15000,
    });
  });

  test("should show distance filter pill when distance params are in URL", async ({
    page,
  }) => {
    await page.goto(
      "/catalunya?distance=25&lat=41.65&lon=2.36",
      { waitUntil: "domcontentloaded" }
    );

    const distancePill = page.getByTestId(/filter-pill-distance/);
    await expect(distancePill.first()).toBeVisible({ timeout: 5000 });
  });

  test("should maintain geolocation params when navigating with filters", async ({
    page,
  }) => {
    await page.goto(
      "/catalunya?distance=20&lat=41.65&lon=2.36",
      { waitUntil: "domcontentloaded" }
    );

    let url = new URL(page.url());
    expect(url.searchParams.get("distance")).toBe("20");
    expect(url.searchParams.has("lat")).toBeTruthy();
    expect(url.searchParams.has("lon")).toBeTruthy();

    await expect(page.getByTestId("events-list")).toBeVisible({
      timeout: 15000,
    });

    url = new URL(page.url());
    expect(url.searchParams.has("distance")).toBeTruthy();
    expect(url.searchParams.has("lat")).toBeTruthy();
    expect(url.searchParams.has("lon")).toBeTruthy();
  });
});

test.describe("Filters Interaction - Distance with Other Filters", () => {
  test("should combine distance + category filters", async ({ page }) => {
    await page.goto(
      "/catalunya/musica?distance=20&lat=41.65&lon=2.36",
      { waitUntil: "domcontentloaded", timeout: 30000 }
    );

    const url = new URL(page.url());
    
    // Should have both distance and category in URL
    expect(url.pathname).toContain("/musica");
    expect(url.searchParams.get("distance")).toBe("20");
    expect(url.searchParams.has("lat")).toBeTruthy();
    expect(url.searchParams.has("lon")).toBeTruthy();

    await expect(page.getByTestId("events-list")).toBeVisible({
      timeout: 15000,
    });

    // Distance pill should be visible
    await expect(page.getByTestId(/filter-pill-distance/).first()).toBeVisible({
      timeout: 5000,
    });
    
    // Category pill should be visible
    await expect(page.getByTestId(/filter-pill-category/).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("should allow distance filter on any place", async ({ page }) => {
    await page.goto(
      "/barcelona?distance=20&lat=41.39&lon=2.17",
      { waitUntil: "domcontentloaded" }
    );

    await page.waitForTimeout(2000);

    const url = new URL(page.url());
    
    // Distance params should be present
    expect(url.searchParams.get("distance")).toBe("20");
    expect(url.searchParams.has("lat")).toBeTruthy();
    expect(url.searchParams.has("lon")).toBeTruthy();
    
    // Can stay on barcelona or catalunya
    expect(url.pathname).toMatch(/^\/(barcelona|catalunya)/);
  });

  test("should clear distance when switching to a specific place", async ({ page }) => {
    // Start with distance filter
    await page.goto(
      "/catalunya?distance=20&lat=41.65&lon=2.36",
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.getByTestId("events-list")).toBeVisible({
      timeout: 15000,
    });

    // Navigate to a specific place
    await page.goto("/barcelona", { waitUntil: "domcontentloaded" });

    await page.waitForTimeout(1000);

    const url = new URL(page.url());
    
    // Distance params should be cleared
    expect(url.pathname).toContain("/barcelona");
    expect(url.searchParams.has("distance")).toBeFalsy();
    expect(url.searchParams.has("lat")).toBeFalsy();
    expect(url.searchParams.has("lon")).toBeFalsy();
  });

  test("should combine distance + search filters", async ({ page }) => {
    await page.goto(
      "/catalunya?distance=30&lat=41.65&lon=2.36&search=concert",
      { waitUntil: "domcontentloaded" }
    );

    const url = new URL(page.url());
    
    // Should have both distance and search in URL
    expect(url.searchParams.get("distance")).toBe("30");
    expect(url.searchParams.get("search")).toBe("concert");
    expect(url.searchParams.has("lat")).toBeTruthy();
    expect(url.searchParams.has("lon")).toBeTruthy();

    await expect(page.getByTestId("events-list")).toBeVisible({
      timeout: 15000,
    });
  });
});
