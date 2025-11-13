import { test, expect, type Page } from "@playwright/test";

async function fetchAnyEventSlug(page: Page): Promise<string | undefined> {
  // Go through internal API proxy so server signs with HMAC
  const res = await page.request.get(`/api/events?size=1`);
  const data = (await res.json()) as { content?: Array<{ slug?: string }> };
  const slug = data?.content?.[0]?.slug;
  return slug ?? undefined;
}

test.describe("JSON-LD presence", () => {
  test("List page exposes JSON-LD (ItemList or Event)", async ({ page }) => {
    // Use a deterministic list route that always has content (Catalunya root)
    await page.goto("/catalunya", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    // Wait until at least one JSON-LD script is present (SSR should render Website schema)
    // Use auto-waiting assertion instead of waitForSelector (longer timeout for remote URLs)
    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached({ timeout: process.env.CI ? 90000 : 60000 });
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    let found = false;
    for (let i = 0; i < count; i++) {
      const jsonText = await scripts.nth(i).textContent();
      if (
        jsonText &&
        (/"@type"\s*:\s*"ItemList"/.test(jsonText) ||
          /"@type"\s*:\s*"Event"/.test(jsonText) ||
          /"@type"\s*:\s*"CollectionPage"/.test(jsonText) ||
          /"@type"\s*:\s*"WebPage"/.test(jsonText))
      ) {
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();
  });

  test("Event detail page exposes Event JSON-LD", async ({ page }) => {
    const slug = await fetchAnyEventSlug(page);
    if (!slug) test.skip(true, "No events returned from API");
    await page.goto(`/e/${slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    // Use auto-waiting assertion instead of waitForSelector (longer timeout for remote URLs)
    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached({ timeout: process.env.CI ? 90000 : 60000 });
    const scripts = page.locator('script[type="application/ld+json"]');
    // Some JSON-LD scripts may be hidden; assert presence instead of visibility
    await expect(scripts.first()).toHaveCount(1, { timeout: 10000 });
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
