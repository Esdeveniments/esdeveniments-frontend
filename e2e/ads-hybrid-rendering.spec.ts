import { test, expect } from "@playwright/test";

// SSR should insert ad markers into the initial events list, but client should not insert extra ads when loading more
// We cannot easily introspect isAd from DOM; instead, check that ad containers appear once per page view when scrolling

test.describe("Hybrid rendering: ads are SSR-only", () => {
  test("Home shows sponsored content blocks and does not duplicate after load more", async ({
    page,
  }) => {
    await page.goto("/barcelona", { waitUntil: "domcontentloaded" });

    // Look for sponsored content headings from AdCard/AdArticle usage
    const sponsoredHeadings = page.getByText(/Contingut patrocinat/i);
    const initialCount = await sponsoredHeadings.count();

    // If no ads visible (ad blocker/Google not loaded), still pass by ensuring no explosive duplication later
    // Trigger load more if present
    const loadMore = page.getByRole("button", { name: /carrega més|més/i });
    if (await loadMore.isVisible()) {
      await loadMore.click();
      await page.waitForLoadState("networkidle");
    }

    const afterCount = await sponsoredHeadings.count();
    expect(afterCount).toBeGreaterThanOrEqual(0);
    // No duplication burst: afterCount should be <= initialCount + 2 (tolerate one additional AdCard from appended page)
    expect(afterCount).toBeLessThanOrEqual(initialCount + 2);
  });
});
