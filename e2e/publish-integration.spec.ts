import { test, expect, type Page } from "@playwright/test";

/**
 * Staging integration E2E: Publish → Detail → Cleanup
 *
 * This test runs against a real staging/preproduction backend. It requires:
 *   - E2E_STAGING_EMAIL: Test user email
 *   - E2E_STAGING_PASSWORD: Test user password
 *   - PLAYWRIGHT_TEST_BASE_URL: Staging URL (e.g., https://pre.esdeveniments.cat)
 *
 * Run locally (against dev server):
 *   E2E_STAGING_EMAIL=<email> E2E_STAGING_PASSWORD=<pass> \
 *   npx playwright test e2e/publish-integration.spec.ts --config playwright.config.ts
 *
 * Run against a deployed staging URL:
 *   PLAYWRIGHT_TEST_BASE_URL=<url> E2E_STAGING_EMAIL=<email> E2E_STAGING_PASSWORD=<pass> \
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

    // Publishing must land on an event detail page. Failing to extract a slug
    // means the publish didn't complete — assert rather than silently skip.
    const slugMatch = currentUrl.match(/\/e\/([^/?#]+)/);
    expect(
      slugMatch,
      `expected to land on /e/{slug}, got: ${currentUrl}`
    ).not.toBeNull();
    // Guard explicitly so TypeScript narrows the type without `!`.
    if (!slugMatch) throw new Error("unreachable: slug match guard");
    createdEventSlug = slugMatch[1];
    console.log(`Created event slug: ${createdEventSlug}`);

    // ── Step 7: Verify the event detail page ──
    await page.goto(`/en/e/${createdEventSlug}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Title (data we entered) is the H1. This also proves it's not the
    // not-found page, which would render a different heading.
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      TEST_EVENT_TITLE,
      { timeout: 15_000 }
    );

    // Location we entered is rendered somewhere on the page.
    await expect(page.getByText("Test Venue - E2E").first()).toBeVisible({
      timeout: 15_000,
    });

    // Creator attribution ("Published by …"). The DTO + UI exist; assert it
    // softly so a backend not yet populating createdByUser surfaces as a
    // reported failure without masking the core publish→detail flow.
    await expect
      .soft(
        page.getByText(/published by|publicat per|publicado por/i),
        "event detail should attribute the creator (createdByUser)"
      )
      .toBeVisible({ timeout: 10_000 });

    // ── Step 8: Verify the event appears on a listing page ──
    await page.goto("/en/barcelona", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    // Soft: listing may be cached or paginate the fresh event off page 1.
    await expect
      .soft(
        page.getByText(TEST_EVENT_TITLE).first(),
        "freshly published event should appear in the Barcelona listing"
      )
      .toBeVisible({ timeout: 15_000 });
  });
});
