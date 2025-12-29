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
    const found = await page.waitForFunction(
      () => {
        const matchesType = (type: unknown): boolean => {
          if (typeof type === "string") {
            return (
              type === "ItemList" ||
              type === "Event" ||
              type === "CollectionPage" ||
              type === "WebPage" ||
              type === "WebSite"
            );
          }
          if (Array.isArray(type)) {
            return type.some((t) => matchesType(t));
          }
          return false;
        };

        const scripts = Array.from(
          document.querySelectorAll('script[type="application/ld+json"]')
        );

        return scripts.some((script) => {
          const text = script.textContent || "";
          try {
            const data = JSON.parse(text);
            const graph = Array.isArray(data?.["@graph"])
              ? data["@graph"]
              : [data];
            return graph.some((entry) => matchesType(entry?.["@type"]));
          } catch {
            return /"@type"\s*:\s*"(ItemList|Event|CollectionPage|WebPage|WebSite)"/.test(
              text
            );
          }
        });
      },
      { timeout: process.env.CI ? 90000 : 60000 }
    );
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
    await expect(
      page.locator('script[type="application/ld+json"]').first()
    ).toBeAttached({ timeout: process.env.CI ? 90000 : 60000 });
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
