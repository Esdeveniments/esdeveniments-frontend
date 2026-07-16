import { test, expect, type Page } from "@playwright/test";
import { loginViaUI } from "./helpers/login";

/**
 * E2E: Creator-only edit access + form submission
 *
 * Requires the same staging credentials as publish-integration.spec.ts:
 *   - E2E_STAGING_EMAIL
 *   - E2E_STAGING_PASSWORD
 *
 * The flow publishes an event, then verifies that:
 *   - The creator sees the "Edit event" button on the detail page.
 *   - The creator can navigate to /e/{slug}/edita.
 *   - The creator can submit the edit form and the update succeeds (no 500).
 *   - The updated title appears on the event detail page after redirect.
 *   - A non-creator (mocked via /api/auth/me) does not see the edit button.
 *   - A logged-out user gets a 404 from /e/{slug}/edita.
 */

const email = process.env.E2E_STAGING_EMAIL;
const password = process.env.E2E_STAGING_PASSWORD;
const hasCredentials = Boolean(email && password);

const UNIQUE_SUFFIX = `e2e-edit-${Date.now()}`;
const TEST_EVENT_TITLE = `Edit Test Event ${UNIQUE_SUFFIX}`;
const EDITED_TITLE = `Edited ${UNIQUE_SUFFIX}`;

let createdEventSlug: string | null = null;

async function publishTestEvent(page: Page) {
  await page.goto("/en/publica", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  const form = page.getByTestId("event-form");
  await expect(form).toBeVisible({ timeout: 30_000 });
  await expect(form).toHaveAttribute("data-hydrated", "true", {
    timeout: 30_000,
  });

  // Step 0: basics
  await page.locator("#title").fill(TEST_EVENT_TITLE);
  await page.locator("#description").fill(
    `Automated E2E edit-access test event created at ${new Date().toISOString()}. Safe to delete.`
  );
  await page.locator("#url").fill("https://example.com/e2e-edit-test");
  await page.getByTestId("next-button").click();

  // Step 1: location
  const townSelect = page.getByTestId("town-select");
  await expect(townSelect).toBeVisible({ timeout: 15_000 });
  await townSelect.click();
  await page.keyboard.type("Barcelona");
  await page.waitForTimeout(1_000);
  await page.keyboard.press("Enter");
  await page.locator("#location").fill("Test Venue - Edit E2E");

  const categoriesSelect = page.locator("#categories").locator("..");
  await categoriesSelect.click();
  await page.waitForTimeout(500);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");

  await page.getByTestId("next-button").click();

  // Step 2: image & dates
  const imageUrlTab = page.getByRole("button", { name: /url|enllaç/i });
  if (await imageUrlTab.isVisible()) {
    await imageUrlTab.click();
  }

  const imageUrlInput = page.locator('input[placeholder*="http"]').first();
  if (await imageUrlInput.isVisible()) {
    await imageUrlInput.fill("https://picsum.photos/800/600");
  }

  const startDateInput = page.locator("#event-date-start");
  if (await startDateInput.isVisible()) {
    const startVal = await startDateInput.inputValue();
    if (!startVal) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await startDateInput.fill(tomorrow.toISOString().split("T")[0]);
    }
  }

  const endDateInput = page.locator("#event-date-end");
  if (await endDateInput.isVisible()) {
    const endVal = await endDateInput.inputValue();
    if (!endVal) {
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      await endDateInput.fill(dayAfter.toISOString().split("T")[0]);
    }
  }

  const publishButton = page.getByTestId("publish-button");
  await expect(publishButton).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);
  await publishButton.click();

  await page.waitForURL((url) => !url.pathname.includes("/publica"), {
    timeout: 60_000,
  });

  const currentUrl = page.url();
  const slugMatch = currentUrl.match(/\/e\/([^/?#]+)/);
  expect(slugMatch, `expected to land on /e/{slug}, got: ${currentUrl}`).not.toBeNull();
  if (!slugMatch) throw new Error("unreachable: slug match guard");
  createdEventSlug = slugMatch[1];
}

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

test.describe("Creator-only edit access (staging)", () => {
  test.skip(!hasCredentials, "Skipped: E2E_STAGING_EMAIL/E2E_STAGING_PASSWORD not set");
  test.setTimeout(180_000);

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await loginViaUI(page, email!, password!);
      await publishTestEvent(page);
    } finally {
      await context.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    if (!createdEventSlug) return;
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await loginViaUI(page, email!, password!);
      await cleanupEvent(page, createdEventSlug);
    } finally {
      await context.close();
    }
  });

  test("creator sees the edit button and can access the edit page", async ({ page }) => {
    await loginViaUI(page, email!, password!);

    await page.goto(`/en/e/${createdEventSlug}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const editLink = page.getByTestId("event-edit-link");
    await expect(editLink).toBeVisible({ timeout: 15_000 });
    await expect(editLink).toHaveAttribute("href", `/en/e/${createdEventSlug}/edita`);

    await editLink.click();
    await page.waitForURL((url) => url.pathname.includes("/edita"), {
      timeout: 30_000,
    });
    await expect(page.getByTestId("event-form")).toBeVisible({ timeout: 30_000 });
  });

  test("creator can submit the edit form and the update succeeds", async ({ page }) => {
    await loginViaUI(page, email!, password!);

    // Navigate directly to the edit page
    await page.goto(`/en/e/${createdEventSlug}/edita`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const form = page.getByTestId("event-form");
    await expect(form).toBeVisible({ timeout: 30_000 });
    await expect(form).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    });

    // Step 0: Update the title
    const titleInput = page.locator("#title");
    await expect(titleInput).toBeVisible({ timeout: 15_000 });
    await titleInput.fill(EDITED_TITLE);

    // Navigate to the last step to find the submit button
    // Step 1: location (just click Next, fields are pre-filled)
    await page.getByTestId("next-button").click();
    // Wait for step 1 content to appear before advancing
    await expect(page.getByTestId("town-select")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("next-button").click();

    // Now we should be on the last step with the submit button
    const submitButton = page.getByTestId("publish-button");
    await expect(submitButton).toBeVisible({ timeout: 15_000 });
    await expect(submitButton).toBeEnabled({ timeout: 10_000 });

    // Wait for the publish button to arm (canPublishRef has a 250ms delay
    // after step change to prevent accidental submits during transition)
    await page.waitForTimeout(500);

    // Submit the form — this must not 500 (the `indexed` bug)
    await submitButton.click();

    // Wait for redirect back to the event detail page
    await page.waitForURL(
      (url) => url.pathname.includes("/e/") && !url.pathname.includes("/edita"),
      { timeout: 60_000 }
    );

    // Update createdEventSlug in case the title change caused a slug change
    // (so afterAll cleanup deletes the right event)
    const newSlugMatch = page.url().match(/\/e\/([^/?#]+)/);
    if (newSlugMatch) createdEventSlug = newSlugMatch[1];

    // Verify the updated title appears on the detail page
    await expect(page.getByText(EDITED_TITLE).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("non-creator does not see the edit button", async ({ page }) => {
    // Mock /api/auth/me to a different user so the client-side creator check fails.
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "other-user-uuid",
            email: "other@example.com",
            name: "Other User",
            username: "other-user",
            role: "USER",
            emailVerified: true,
          },
        }),
      })
    );

    await page.goto(`/en/e/${createdEventSlug}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(page.getByTestId("event-edit-link")).not.toBeVisible();
  });

  test("logged-out user gets 404 on the edit page", async ({ page }) => {
    // Ensure no session cookie is sent by clearing cookies.
    await page.context().clearCookies();

    const response = await page.goto(`/en/e/${createdEventSlug}/edita`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    expect(response?.status()).toBe(404);
  });
});
