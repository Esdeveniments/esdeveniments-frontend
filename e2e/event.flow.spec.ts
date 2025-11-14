import { test, expect } from "@playwright/test";

// Event flow: visit sitemap, try to open some event. If none, verify 404 page renders on fake slug.

test.describe("Event detail flow", () => {
  test("open an event card when available or show not-found", async ({
    page,
  }) => {
    await page.goto("/sitemap", { waitUntil: "domcontentloaded", timeout: 60000 });
    
    // Try city link first (they're on the main sitemap page)
    const cityLink = page.getByTestId("sitemap-city-link").first();
    if (await cityLink.isVisible({ timeout: 10000 })) {
      // Wait for navigation to complete after clicking city link
      await Promise.all([
        page.waitForURL(/\/sitemap\/[^/]+$/, { timeout: 30000 }),
        cityLink.click(),
      ]);
      
      // Wait for the town sitemap page to load
      await page.waitForLoadState("domcontentloaded");
      
      // Find a month link on the town sitemap page (links to /sitemap/{town}/{year}/{month})
      // Month links are in nav elements with role="list"
      const monthLink = page.locator('nav[role="list"] a').first();
      if (await monthLink.isVisible({ timeout: 10000 })) {
        // Wait for navigation to month page
        await Promise.all([
          page.waitForURL(/\/sitemap\/[^/]+\/\d+\/[^/]+$/, { timeout: 30000 }),
          monthLink.click(),
        ]);
        
        // Wait for the month page to load
        await page.waitForLoadState("domcontentloaded");
        
        // Find an event link
        const eventLink = page.locator('a[href^="/e/"]').first();
        if (await eventLink.isVisible({ timeout: 10000 })) {
          await eventLink.click();
          // Wait for navigation to event page
          await page.waitForURL(/\/e\/[^/]+$/, { timeout: 30000 });
          await page.waitForLoadState("domcontentloaded");
          // Event header/title should be visible
          await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
          return;
        }
      }
    }
    
    // Fallback: try region link path
    await page.goto("/sitemap", { waitUntil: "domcontentloaded", timeout: 60000 });
    const regionLink = page.getByTestId("sitemap-region-link").first();
    if (await regionLink.isVisible({ timeout: 10000 })) {
      // Wait for navigation to region page
      await Promise.all([
        page.waitForURL(/\/sitemap\/[^/]+$/, { timeout: 30000 }),
        regionLink.click(),
      ]);
      
      // Wait for the region sitemap page to load
      await page.waitForLoadState("domcontentloaded");
      
      // Find a month link on the region sitemap page (links to /sitemap/{town}/{year}/{month})
      // Month links are in nav elements with role="list"
      const monthLink = page.locator('nav[role="list"] a').first();
      if (await monthLink.isVisible({ timeout: 10000 })) {
        // Wait for navigation to month page
        await Promise.all([
          page.waitForURL(/\/sitemap\/[^/]+\/\d+\/[^/]+$/, { timeout: 30000 }),
          monthLink.click(),
        ]);
        
        // Wait for the month page to load
        await page.waitForLoadState("domcontentloaded");
        
        // Find an event link
        const eventLink = page.locator('a[href^="/e/"]').first();
        if (await eventLink.isVisible({ timeout: 10000 })) {
          await eventLink.click();
          // Wait for navigation to event page
          await page.waitForURL(/\/e\/[^/]+$/, { timeout: 30000 });
          await page.waitForLoadState("domcontentloaded");
          // Event header/title should be visible
          await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
          return;
        }
      }
    }
    
    // Fallback: navigate to a non-existent event
    await page.goto("/e/non-existent-event-slug-12345", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Accept either site-wide not-found or event-specific noEventFound component
    const notFoundTitle = page.getByTestId("not-found-title");
    const noEventFound = page.getByTestId("no-event-found");
    await expect(notFoundTitle.or(noEventFound)).toBeVisible({ timeout: 10000 });
  });
});
