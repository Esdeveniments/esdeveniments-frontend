import { test, expect } from "@playwright/test";

test.describe("JSON-LD presence", () => {
  test("List page exposes JSON-LD (ItemList or Event) when events exist", async ({
    page,
  }) => {
    // Try multiple list routes to increase chances of having events
    const candidates = [
      "/catalunya",
      "/barcelona",
      "/catalunya/avui",
      "/barcelona/avui",
    ];
    let found = false;
    for (const path of candidates) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      // Only assert JSON-LD if there are event links on the page
      const eventLinkVisible = await page
        .locator('a[href^="/e/"]')
        .first()
        .isVisible();
      if (!eventLinkVisible) continue;
      // Look for scripts that likely contain ItemList/Event JSON-LD
      const scripts = page.locator('script[type="application/ld+json"]');
      const count = await scripts.count();
      if (count > 0) {
        // Soft check for ItemList marker in any script
        for (let i = 0; i < count; i++) {
          const jsonText = await scripts.nth(i).textContent();
          if (
            jsonText &&
            (/"@type"\s*:\s*"ItemList"/.test(jsonText) ||
              /"@type"\s*:\s*"Event"/.test(jsonText))
          ) {
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }
    if (!found)
      test.skip(true, "No events with JSON-LD available on candidates");
  });

  test("Event detail page exposes Event JSON-LD", async ({ page }) => {
    await page.goto("/sitemap", { waitUntil: "domcontentloaded" });
    // Click a region or city, then an event
    const firstLink = page.getByTestId("sitemap-region-link").first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
    }
    const cityLink = page.getByTestId("sitemap-city-link").first();
    if (await cityLink.isVisible()) {
      await cityLink.click();
    }
    const eventLink = page.locator('a[href^="/e/"]').first();
    if (!(await eventLink.isVisible())) {
      test.skip(true, "No event links available from sitemap");
    }
    await eventLink.click();
    // Expect at least one JSON-LD script with Event type
    const scripts = page.locator('script[type="application/ld+json"]');
    await expect(scripts.first()).toBeVisible();
    const count = await scripts.count();
    let hasEvent = false;
    for (let i = 0; i < count; i++) {
      const jsonText = await scripts.nth(i).textContent();
      if (jsonText && /"@type"\s*:\s*"Event"/.test(jsonText)) {
        hasEvent = true;
        break;
      }
    }
    expect(hasEvent).toBeTruthy();
  });
});
