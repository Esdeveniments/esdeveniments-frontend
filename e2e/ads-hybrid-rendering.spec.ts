import { test, expect } from "@playwright/test";

// SSR inserts the ad slots once (insertAds); loading more events on the
// client must append events only, never more ads.
test.describe("Hybrid rendering: ads are SSR-only", () => {
  test("Load more does not add sponsored blocks", async ({ page }) => {
    await page.goto("/catalunya", { waitUntil: "load" });

    const cards = page.locator('a[href^="/e/"][data-analytics-event-slug]');
    // insertAds places the first ad after the third event.
    test.skip((await cards.count()) < 3, "Not enough events for an ad");

    // AdCardClient is ssr:false, so every ad mounts together after hydration
    // from the same chunk. Wait for the first one, then count them all.
    const sponsored = page.getByText(/Contingut patrocinat/i);
    await expect(sponsored.first()).toBeVisible({ timeout: 30_000 });
    const before = await sponsored.count();

    const loadMore = page.getByRole("button", { name: /Carregar més/i });
    test.skip(!(await loadMore.isVisible()), "No more events to load");

    const cardsBefore = await cards.count();
    const response = page.waitForResponse(
      (r) => r.url().includes("/api/events") && r.ok(),
    );
    await loadMore.click();
    await response;
    await expect.poll(() => cards.count()).toBeGreaterThan(cardsBefore);

    await expect(sponsored).toHaveCount(before);
  });
});
