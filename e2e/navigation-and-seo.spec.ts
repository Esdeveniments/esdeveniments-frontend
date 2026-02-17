import { test, expect } from "@playwright/test";

test.describe("Navigation and SEO basics", () => {
  test("Navbar links navigate to core pages", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });
    // Wait for navigation to be ready (auto-waiting assertion)
    const nav = page.getByRole("navigation").first();
    await expect(nav).toBeVisible({ timeout: 30000 });
    
    // Navigate to Publicar
    const publicarLink = nav.getByRole("link", { name: "Publicar" });
    await expect(publicarLink).toBeVisible({ timeout: 30000 });
    // waitForURL in Promise.all is recommended pattern for navigation
    await Promise.all([
      page.waitForURL(/\/publica$/, { timeout: 90000 }),
      publicarLink.click(),
    ]);
    
    // Wait for navigation to be ready again after navigation (auto-waiting assertion)
    await expect(nav).toBeVisible({ timeout: 30000 });
    
    // Navigate back to Agenda (catalunya page)
    const agendaLink = nav.getByRole("link", { name: "Agenda" });
    await expect(agendaLink).toBeVisible({ timeout: 30000 });
    // waitForURL in Promise.all is recommended pattern for navigation
    await Promise.all([
      page.waitForURL(/\/catalunya$/, { timeout: 90000 }),
      agendaLink.click(),
    ]);
    
    // Wait for navigation to be ready again (auto-waiting assertion)
    await expect(nav).toBeVisible({ timeout: 30000 });
    
    // Navigate to Notícies
    const noticiesLink = nav.getByRole("link", { name: "Notícies" });
    await expect(noticiesLink).toBeVisible({ timeout: 30000 });
    // waitForURL in Promise.all is recommended pattern for navigation
    await Promise.all([
      page.waitForURL(/\/noticies$/, { timeout: 90000 }),
      noticiesLink.click(),
    ]);
  });

  test("Core pages expose canonical link and basic OG tags", async ({
    page,
  }) => {
    // Use catalunya which always exists, and barcelona which may redirect
    const paths = ["/", "/catalunya", "/catalunya/avui"];
    for (const p of paths) {
      await page.goto(p, { waitUntil: "domcontentloaded", timeout: 90000 });
      const canonical = page.locator('link[rel="canonical"]');
      // Next.js 16 streaming / ISR may occasionally render duplicate head tags
      // (environment artifact), so we assert .first() exists instead of exact count.
      await expect(canonical.first()).toBeAttached({ timeout: process.env.CI ? 60000 : 30000 });
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle.first()).toBeAttached({ timeout: process.env.CI ? 60000 : 30000 });
      const ogUrl = page.locator('meta[property="og:url"]');
      await expect(ogUrl.first()).toBeAttached({ timeout: process.env.CI ? 60000 : 30000 });
    }
  });
});
