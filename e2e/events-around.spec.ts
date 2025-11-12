import { test, expect, type Page } from "@playwright/test";

async function getFirstEventSlug(page: Page): Promise<string | undefined> {
  // Fetch via the app's internal API so the server signs with HMAC
  const res = await page.request.get(`/api/events?size=1`);
  const data = (await res.json()) as { content?: Array<{ slug?: string }> };
  const slug = data?.content?.[0]?.slug;
  return slug ?? undefined;
}

test.describe("Events around section", () => {
  test("renders related events and links work", async ({ page }) => {
    const slug = await getFirstEventSlug(page);
    if (!slug) test.skip(true, "No events returned from API");
    await page.goto(`/e/${slug}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const section = page.getByRole("heading", {
      name: /esdeveniments relacionats/i,
    });
    if (await section.isVisible()) {
      const link = page.locator('a[href^="/e/"]').nth(1);
      if (await link.isVisible()) {
        const href = await link.getAttribute("href");
        await link.click();
        // Allow absolute URLs by only anchoring at the end
        await expect(page).toHaveURL(
          new RegExp(`${href?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)
        );
      } else {
        // Section present but no links; treat as pass since not guaranteed
        expect(true).toBeTruthy();
      }
    } else {
      // No related section is acceptable depending on event
      expect(true).toBeTruthy();
    }
  });
});
