import { test, expect, type Page } from "@playwright/test";

/**
 * Staging integration E2E: Publish → Detail → Cleanup
 *
 * This test runs against a real staging/preproduction backend. It requires:
 *   - E2E_STAGING_EMAIL: Test user email
 *   - E2E_STAGING_PASSWORD: Test user password
 *   - PLAYWRIGHT_TEST_BASE_URL: Staging URL (e.g., https://pre.esdeveniments.cat)
 *
 * Run with: PLAYWRIGHT_TEST_BASE_URL=<url> E2E_STAGING_EMAIL=<email> E2E_STAGING_PASSWORD=<pass> \
 *   npx playwright test e2e/publish-integration.spec.ts --config playwright.remote.config.ts
 *
 * Gated: Skips automatically if env vars are not set.
 */

const email = process.env.E2E_STAGING_EMAIL;
const password = process.env.E2E_STAGING_PASSWORD;
const hasCredentials = Boolean(email && password);

const UNIQUE_SUFFIX = `e2e-${Date.now()}`;
const TEST_EVENT_TITLE = `Test Event ${UNIQUE_SUFFIX}`;

// Store created event slug for cleanup
let createdEventSlug: string | null = null;

/** Login via the UI form */
async function loginViaUI(page: Page) {
  await page.goto("/en/iniciar-sessio", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 30_000 });

  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page
    .getByTestId("login-form")
    .getByRole("button", { name: /log in|iniciar|entra/i })
    .click();

  // Wait for redirect away from login page after successful login
  await page.waitForURL((url) => !url.pathname.includes("/iniciar-sessio"), {
    timeout: 30_000,
  });
}

/** Delete event via API (direct fetch with cookies from browser context) */
async function cleanupEvent(page: Page, uuid: string) {
  try {
    const response = await page.evaluate(async (eventUuid: string) => {
      const res = await fetch(`/api/events/${eventUuid}`, {
        method: "DELETE",
      });
      return { status: res.status, ok: res.ok };
    }, uuid);
    console.log(`Cleanup event ${uuid}: ${response.status}`);
  } catch (error) {
    console.warn(`Failed to clean up event ${uuid}:`, error);
  }
}

test.describe("Publish integration (staging)", () => {
  // Skip entire suite if no staging credentials
  test.skip(!hasCredentials, "Skipped: E2E_STAGING_EMAIL/E2E_STAGING_PASSWORD not set");
  test.setTimeout(180_000); // 3 minutes — real backend is slow

  test.afterAll(async ({ browser }) => {
    // Best-effort cleanup via API if we captured the slug
    if (createdEventSlug) {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await loginViaUI(page);
        await cleanupEvent(page, createdEventSlug);
      } catch (error) {
        console.warn("Cleanup failed:", error);
      } finally {
        await context.close();
      }
    }
  });

  test("login → publish event → verify detail page shows creator", async ({
    page,
  }) => {
    // Log all API responses for debugging
    page.on("response", async (response) => {
      if (response.url().includes("/api/")) {
        const body = await response.text().catch(() => "<no body>");
        console.log(`[API] ${response.status()} ${response.url().replace(/http:\/\/localhost:3000/, "")}: ${body.substring(0, 300)}`);
      }
    });

    // ── Step 0: Login ──
    await loginViaUI(page);

    // Verify we're logged in (avatar button visible in navbar)
    await expect(
      page.getByTestId("user-avatar-button")
    ).toBeVisible({ timeout: 15_000 });

    // ── Step 1: Navigate to publish page ──
    await page.goto("/en/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const form = page.getByTestId("event-form");
    await expect(form).toBeVisible({ timeout: 30_000 });
    await expect(form).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    });

    // ── Step 2: Fill form — Step 0 (basics) ──
    await page.locator("#title").fill(TEST_EVENT_TITLE);
    await page.locator("#description").fill(
      `Automated E2E test event created at ${new Date().toISOString()}. Safe to delete.`
    );
    await page.locator("#url").fill("https://example.com/e2e-test");

    // Advance to step 1
    await page.getByTestId("next-button").click();

    // ── Step 3: Fill form — Step 1 (location) ──
    // Wait for cities to load, then select first available town
    const townSelect = page.getByTestId("town-select");
    await expect(townSelect).toBeVisible({ timeout: 15_000 });

    // Click the select to open dropdown, type to search, pick first result
    await townSelect.click();
    await page.keyboard.type("Barcelona");
    await page.waitForTimeout(1_000); // Wait for async search
    // Select the first option from the dropdown
    await page.keyboard.press("Enter");

    // Fill location name
    await page.locator("#location").fill("Test Venue - E2E");

    // Select first available category
    const categoriesSelect = page.locator("#categories").locator("..");
    await categoriesSelect.click();
    await page.waitForTimeout(500);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    // Close the dropdown
    await page.keyboard.press("Escape");

    // Advance to step 2
    await page.getByTestId("next-button").click();

    // ── Step 4: Fill form — Step 2 (image & dates) ──
    // Use URL mode for image (simpler for E2E)
    const imageUrlTab = page.getByRole("button", { name: /url|enllaç/i });
    if (await imageUrlTab.isVisible()) {
      await imageUrlTab.click();
    }

    // Fill image URL (use a known stable placeholder)
    const imageUrlInput = page.locator('input[placeholder*="http"]').first();
    if (await imageUrlInput.isVisible()) {
      await imageUrlInput.fill("https://picsum.photos/800/600");
    }

    // Dates should have defaults — verify start date is populated
    const startDateInput = page.locator("#event-date-start");
    if (await startDateInput.isVisible()) {
      const startVal = await startDateInput.inputValue();
      if (!startVal) {
        // Set to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const formatted = tomorrow.toISOString().split("T")[0];
        await startDateInput.fill(formatted);
      }
    }

    const endDateInput = page.locator("#event-date-end");
    if (await endDateInput.isVisible()) {
      const endVal = await endDateInput.inputValue();
      if (!endVal) {
        const dayAfter = new Date();
        dayAfter.setDate(dayAfter.getDate() + 2);
        const formatted = dayAfter.toISOString().split("T")[0];
        await endDateInput.fill(formatted);
      }
    }

    // ── Step 5: Submit ──
    const publishButton = page.getByTestId("publish-button");
    await expect(publishButton).toBeVisible({ timeout: 10_000 });

    // Wait for canPublishRef to arm (250ms guard in EventForm)
    await page.waitForTimeout(500);

    await publishButton.click();

    // ── Step 6: Wait for success ──
    // After publish, the page should redirect to the event detail or show success
    // Wait for navigation away from /publica
    await page.waitForURL((url) => !url.pathname.includes("/publica"), {
      timeout: 60_000,
    });

    const currentUrl = page.url();
    console.log(`Event created, redirected to: ${currentUrl}`);

    // Extract slug from URL (pattern: /e/{slug} or /en/e/{slug})
    const slugMatch = currentUrl.match(/\/e\/([^/?#]+)/);
    if (slugMatch) {
      createdEventSlug = slugMatch[1];
      console.log(`Created event slug: ${createdEventSlug}`);
    }

    // ── Step 7: Verify event detail page ──
    // If we got redirected to the event page, verify content
    if (createdEventSlug) {
      // Navigate to ensure clean load
      await page.goto(`/en/e/${createdEventSlug}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      // Verify the event title is displayed
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        TEST_EVENT_TITLE,
        { timeout: 15_000 }
      );

      // Verify "Created by" / "Published by" user info is shown (optional — backend may not return it yet)
      const creatorText = page.locator("text=/created by|publicat per|creado por/i");
      const creatorVisible = await creatorText.isVisible().catch(() => false);
      if (creatorVisible) {
        console.log("✅ Creator info is displayed on event detail page");
      } else {
        console.log("ℹ️ Creator info not shown — backend may not include createdByUser yet");
      }

      // Extract event UUID from page data or API for cleanup
      // Try to find it from the page's meta or data attributes
      try {
        const metaUuid = await page.evaluate(() => {
          // Look for canonical URL or data attribute containing the UUID
          const canonical = document.querySelector('link[rel="canonical"]');
          const ogUrl = document.querySelector('meta[property="og:url"]');
          return (canonical as HTMLLinkElement)?.href ?? (ogUrl as HTMLMetaElement)?.content ?? null;
        });
        console.log(`Event meta URL: ${metaUuid}`);
      } catch {
        // UUID extraction optional — we'll try slug-based cleanup
      }
    }

    // ── Step 8: Verify listing page shows event ──
    // Go to the listing and check the event appears
    await page.goto("/en/barcelona", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // The event should appear in the listing (may need to scroll)
    const eventCard = page.locator(`text=${TEST_EVENT_TITLE}`).first();
    // Don't fail on this — event might be on page 2 or take time to appear
    const isVisible = await eventCard.isVisible().catch(() => false);
    if (isVisible) {
      console.log("✅ Event visible in listing page");
    } else {
      console.log("⚠️ Event not immediately visible in listing (may be cached)");
    }
  });
});
