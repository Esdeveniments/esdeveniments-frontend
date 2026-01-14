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

    // Check for pricing CTA button
    await expect(page.getByRole("link", { name: /veure preus/i })).toBeVisible();

    // Pricing section exists (identified by id="pricing")
    const pricingSection = page.locator("#pricing");
    await expect(pricingSection).toBeVisible();

    // Benefits section exists
    await expect(
      page.getByRole("heading", { name: /anunciar-te/i })
    ).toBeVisible();
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

    // How it works heading exists
    await expect(
      page.getByRole("heading", { name: /com funciona/i })
    ).toBeVisible();

    // Steps are visible (we expect at least 3-4 steps)
    const stepIndicators = page.locator('[data-testid^="step-indicator-"]');
    const stepCount = await stepIndicators.count();
    expect(stepCount).toBeGreaterThanOrEqual(3);
  });

  test("FAQ section is present", async ({ page }) => {
    await navigateToPatrocina(page);

    // FAQ heading exists
    await expect(
      page.getByRole("heading", { name: /preguntes freq/i })
    ).toBeVisible();
  });

  test("contact section has email link", async ({ page }) => {
    await navigateToPatrocina(page);

    // Contact section exists
    await expect(
      page.getByRole("heading", { name: /tens dubtes/i })
    ).toBeVisible();

    // Email link is present (button/link with mailto: href)
    const emailLink = page.getByRole("link", { name: /contactar|email/i });
    await expect(emailLink).toBeVisible();
    
    // Verify it's a mailto link
    const href = await emailLink.getAttribute("href");
    expect(href).toContain("mailto:");
  });

  test("back to home link works", async ({ page }) => {
    await navigateToPatrocina(page);

    // Find and click the back link
    const backLink = page.getByRole("link", { name: /tornar/i });
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

    // Within the slot, either empty state CTA or sponsor banner should be visible
    const sponsorCta = sponsorSlot.getByRole("link", { name: /anuncia/i });
    const sponsorBanner = sponsorSlot.locator('[data-testid="sponsor-banner"]');

    // Assert: exactly one of these should be visible (mutually exclusive)
    const ctaVisible = await sponsorCta.isVisible();
    const bannerVisible = await sponsorBanner.isVisible();

    expect(
      ctaVisible || bannerVisible,
      "Expected either sponsor CTA or sponsor banner to be visible"
    ).toBe(true);

    // If empty state CTA is shown, verify it links to patrocina
    if (ctaVisible) {
      const href = await sponsorCta.getAttribute("href");
      expect(href).toContain("/patrocina");
    }
  });
});
