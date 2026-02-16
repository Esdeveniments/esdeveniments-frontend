import { test, expect, Page } from "@playwright/test";

/**
 * E2E tests for the sponsor system.
 *
 * Tests the /patrocina landing page which is publicly accessible.
 * Does NOT test sponsor banners on place pages (those require active sponsors
 * in config/sponsors.ts which we don't want in production).
 *
 * @see /strategy-pricing.md for system documentation
 */

/**
 * Navigate to /patrocina and wait for page to be ready
 */
async function navigateToPatrocina(page: Page): Promise<void> {
  await page.goto("/patrocina", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // Wait for page to be interactive
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 30000,
  });
}

test.describe("Sponsor Landing Page (/patrocina)", () => {
  test("renders the patrocina page with key sections", async ({ page }) => {
    await navigateToPatrocina(page);

    // Check for pricing CTA button (text: "Comença per 5€")
    await expect(page.getByRole("link", { name: /comença per/i })).toBeVisible();

    // Pricing section exists (identified by id="pricing")
    const pricingSection = page.locator("#pricing");
    await expect(pricingSection).toBeVisible();

    // Benefits section exists
    await expect(page.getByTestId("benefits-section")).toBeVisible();
  });

  test("pricing section has place selector for scope selection", async ({
    page,
  }) => {
    await navigateToPatrocina(page);

    // Check for place selector (searchable dropdown for town/region/country)
    // The UI uses a place selector instead of tabs
    await expect(
      page.getByPlaceholder(/cerca un poble|search/i)
    ).toBeVisible();
  });

  test("how it works section displays steps", async ({ page }) => {
    await navigateToPatrocina(page);

    // How it works section exists
    await expect(page.getByTestId("how-it-works-section")).toBeVisible();

    // Steps are visible (we expect at least 3-4 steps)
    const stepIndicators = page.locator('[data-testid^="step-indicator-"]');
    const stepCount = await stepIndicators.count();
    expect(stepCount).toBeGreaterThanOrEqual(3);
  });

  test("FAQ section is present", async ({ page }) => {
    await navigateToPatrocina(page);

    // FAQ section exists
    await expect(page.getByTestId("faq-section")).toBeVisible();
  });

  test("contact section has email link", async ({ page }) => {
    await navigateToPatrocina(page);

    // Contact section exists
    await expect(
      page.getByRole("heading", { name: /tens dubtes/i })
    ).toBeVisible();

    // Email link is present (button/link with mailto: href)
    const emailLink = page.getByRole("link", { name: /escriu/i });
    await expect(emailLink).toBeVisible();
    
    // Verify it's a mailto link
    const href = await emailLink.getAttribute("href");
    expect(href).toContain("mailto:");
  });

  test("back to home link works", async ({ page }) => {
    await navigateToPatrocina(page);

    // Find and click the back link (text: "Torna a l'inici")
    const backLink = page.getByRole("link", { name: /torna/i });
    await expect(backLink).toBeVisible();

    await backLink.click();

    // Should navigate to home
    await expect(page).toHaveURL("/");
  });
});

test.describe("Sponsor Empty State CTA", () => {
  test("place page shows sponsor empty state when no active sponsor", async ({
    page,
  }) => {
    // Navigate to a place page that likely has no active sponsor
    // Using a common place that's unlikely to have a paid sponsor
    await page.goto("/mataro", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Wait for page to load
    await expect(page.getByTestId("search-input")).toBeVisible({
      timeout: 30000,
    });

    // Look for sponsor slot container (always present on place pages)
    const sponsorSlot = page.locator('[data-testid="sponsor-slot"]');
    await expect(sponsorSlot).toBeVisible({ timeout: 10000 });

    // Within the slot, either empty state CTA, sponsor banner, or house ad should be visible
    const sponsorCta = sponsorSlot.getByRole("link", { name: /anuncia/i });
    const sponsorBanner = sponsorSlot.locator('[data-testid="sponsor-banner"]');
    const houseAd = sponsorSlot.locator('[data-testid="house-ad-text"]');

    // Assert: at least one of these should be visible (use .or() for auto-waiting)
    await expect(
      sponsorCta.or(sponsorBanner).or(houseAd).first(),
      "Expected either sponsor CTA, sponsor banner, or house ad to be visible"
    ).toBeVisible({ timeout: 10000 });

    // If empty state CTA is shown, verify it links to patrocina
    // Use count() after the visibility wait above to avoid flakiness
    if ((await sponsorCta.count()) > 0 && (await sponsorCta.isVisible())) {
      const href = await sponsorCta.getAttribute("href");
      expect(href).toContain("/patrocina");
    }

    // If house ad is shown, verify it links to patrocina
    if ((await houseAd.count()) > 0 && (await houseAd.isVisible())) {
      const houseAdLink = houseAd.locator('a[href*="/patrocina"]');
      await expect(houseAdLink).toBeVisible();
    }
  });
});
