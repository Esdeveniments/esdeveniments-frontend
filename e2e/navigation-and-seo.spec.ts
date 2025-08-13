import { test, expect } from "@playwright/test";

test.describe("Navigation and SEO basics", () => {
  test("Navbar links navigate to core pages", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Disambiguate header nav
    const nav = page.getByRole("navigation").first();
    await nav.getByRole("link", { name: "Publicar" }).click();
    await expect(page).toHaveURL(/\/publica$/);
    await nav.getByRole("link", { name: "Agenda" }).click();
    await expect(page).toHaveURL(/\/$/);
    await nav.getByRole("link", { name: "Notícies" }).click();
    await expect(page).toHaveURL(/\/noticies$/);
  });

  test("Core pages expose canonical link and basic OG tags", async ({
    page,
  }) => {
    const paths = ["/", "/barcelona", "/barcelona/avui"];
    for (const p of paths) {
      await page.goto(p, { waitUntil: "domcontentloaded" });
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveCount(1);
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveCount(1);
      const ogUrl = page.locator('meta[property="og:url"]');
      await expect(ogUrl).toHaveCount(1);
    }
  });
});
