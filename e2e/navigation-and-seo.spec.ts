import { test, expect } from "@playwright/test";

test.describe("Navigation and SEO basics", () => {
  test("Navbar links navigate to core pages", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Wait for navigation to be ready
    const nav = page.getByRole("navigation").first();
    await nav.waitFor({ state: "visible" });
    
    // Navigate to Publicar
    const publicarLink = nav.getByRole("link", { name: "Publicar" });
    await publicarLink.waitFor({ state: "visible" });
    await Promise.all([
      page.waitForURL(/\/publica$/, { timeout: 20000 }),
      publicarLink.click(),
    ]);
    
    // Wait for navigation to be ready again after navigation
    await nav.waitFor({ state: "visible" });
    
    // Navigate back to Agenda (home)
    const agendaLink = nav.getByRole("link", { name: "Agenda" });
    await agendaLink.waitFor({ state: "visible" });
    await Promise.all([
      page.waitForURL(/\/$/, { timeout: 20000 }),
      agendaLink.click(),
    ]);
    
    // Wait for navigation to be ready again
    await nav.waitFor({ state: "visible" });
    
    // Navigate to Notícies
    const noticiesLink = nav.getByRole("link", { name: "Notícies" });
    await noticiesLink.waitFor({ state: "visible" });
    await Promise.all([
      page.waitForURL(/\/noticies$/, { timeout: 20000 }),
      noticiesLink.click(),
    ]);
  });

  test("Core pages expose canonical link and basic OG tags", async ({
    page,
  }) => {
    // Use catalunya which always exists, and barcelona which may redirect
    const paths = ["/", "/catalunya", "/catalunya/avui"];
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
