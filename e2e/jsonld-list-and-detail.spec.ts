import { test, expect } from "@playwright/test";

async function fetchAnyEventSlug(): Promise<string> {
  const api =
    process.env.NEXT_PUBLIC_API_URL || "https://api-pre.esdeveniments.cat/api";
  const res = await fetch(`${api}/events?size=1`);
  const data = (await res.json()) as { content?: Array<{ slug?: string }> };
  const slug = data?.content?.[0]?.slug;
  if (!slug) throw new Error("No events returned from API");
  return slug;
}

test.describe("JSON-LD presence", () => {
  test("List page exposes JSON-LD (ItemList or Event)", async ({ page }) => {
    // Use a deterministic list route that always has content (Catalunya root)
    await page.goto("/catalunya", { waitUntil: "load", timeout: 60000 });
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    let found = false;
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
    expect(found).toBeTruthy();
  });

  test("Event detail page exposes Event JSON-LD", async ({ page }) => {
    const slug = await fetchAnyEventSlug();
    await page.goto(`/e/${slug}`, { waitUntil: "load", timeout: 60000 });
    const scripts = page.locator('script[type="application/ld+json"]');
    // Some JSON-LD scripts may be hidden; assert presence instead of visibility
    await expect(scripts.first()).toHaveCount(1);
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
