import { test, expect, type Page } from "@playwright/test";

async function fetchAnyEventSlug(page: Page): Promise<string | undefined> {
  const res = await page.request.get(`/api/events?size=1`);
  const data = (await res.json()) as { content?: Array<{ slug?: string }> };
  return data?.content?.[0]?.slug ?? undefined;
}

test.describe("Localized SEO (hreflang + JSON-LD)", () => {
  test("/es/e/:slug has correct alternates and inLanguage", async ({ page }) => {
    const slug = await fetchAnyEventSlug(page);
    if (!slug) test.skip(true, "No events returned from API");

    await page.goto(`/es/e/${slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const alternates = page.locator('head link[rel="alternate"]');
    await expect(alternates.first()).toBeAttached({
      timeout: process.env.CI ? 90000 : 60000,
    });

    const hrefs = await alternates.evaluateAll((els) =>
      els
        .map((el) => ({
          hreflang: el.getAttribute("hreflang"),
          href: el.getAttribute("href"),
        }))
        .filter((x) => typeof x.href === "string" && x.href.length > 0)
    );

    // No double locale segments (regression guard)
    for (const { href } of hrefs) {
      if (!href) continue;
      expect(href).not.toContain("/es/es/");
      expect(href).not.toContain("/en/en/");
      expect(href).not.toContain("/ca/ca/");
    }

    const xDefault = hrefs.find((x) => x.hreflang === "x-default")?.href;
    expect(xDefault).toBeTruthy();
    // x-default should point to default locale (no /es/ prefix)
    expect(xDefault!).not.toContain("/es/");

    // Event JSON-LD should carry the current locale language
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    let found = false;

    for (let i = 0; i < count; i++) {
      const jsonText = await scripts.nth(i).textContent();
      if (!jsonText) continue;
      if (!/"@type"\s*:\s*"Event"/.test(jsonText)) continue;
      if (/"inLanguage"\s*:\s*"es"/.test(jsonText)) {
        found = true;
        break;
      }
    }

    expect(found).toBeTruthy();
  });
});
