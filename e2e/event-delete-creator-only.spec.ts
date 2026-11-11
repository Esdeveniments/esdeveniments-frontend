import { test, expect } from "@playwright/test";
import { loginViaUI } from "./helpers/login";
import { cleanupEvent, publishTestEvent } from "./helpers/publish";

/**
 * E2E: the creator deletes their event from the event page.
 *
 * Uses the same staging credentials as event-edit-creator-only.spec.ts
 * (E2E_STAGING_EMAIL, E2E_STAGING_PASSWORD). It publishes its own event,
 * because that spec runs in parallel and needs its event to stay.
 */

const email = process.env.E2E_STAGING_EMAIL;
const password = process.env.E2E_STAGING_PASSWORD;
const hasCredentials = Boolean(email && password);

const TEST_EVENT_TITLE = `Delete Test Event e2e-delete-${Date.now()}`;

let createdEventSlug: string | null = null;

// Traces record fill() arguments, including the staging password.
test.use({ trace: "off" });

test.describe("Creator-only delete (staging)", () => {
  test.skip(!hasCredentials, "Skipped: E2E_STAGING_EMAIL/E2E_STAGING_PASSWORD not set");
  test.setTimeout(240_000);

  // Only runs if the test failed before the delete went through.
  test.afterAll(async ({ browser }) => {
    test.setTimeout(180_000);
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

  test("creator deletes the event after confirming", async ({ page }) => {
    await loginViaUI(page, email!, password!);
    createdEventSlug = await publishTestEvent(page, TEST_EVENT_TITLE);
    const slug = createdEventSlug;

    await page.goto(`/en/e/${slug}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    // Delete sits in the owner bar's "More actions" menu.
    const moreButton = page.getByTestId("event-owner-more-button");
    await expect(moreButton).toBeVisible({ timeout: 15_000 });
    const openDeleteDialog = async () => {
      await moreButton.click();
      await page.getByRole("menuitem", { name: "Delete event" }).click();
    };

    // Cancel keeps the event.
    await openDeleteDialog();
    // The dialog root has no box of its own (its children are fixed), so
    // Playwright calls it hidden; check its heading instead.
    const dialog = page.getByRole("alertdialog", { name: "Delete this event?" });
    const dialogTitle = dialog.getByRole("heading", { name: "Delete this event?" });
    await expect(dialogTitle).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialogTitle).toBeHidden();

    await openDeleteDialog();
    const deleteResponse = page.waitForResponse(
      (res) => res.url().endsWith(`/api/events/${slug}`) && res.request().method() === "DELETE",
    );
    await page.getByTestId("event-delete-modal-action-button").click();
    expect((await deleteResponse).status()).toBe(204);
    createdEventSlug = null;

    await page.waitForURL((url) => url.pathname === "/en", { timeout: 30_000 });

    await page.goto(`/en/e/${slug}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(
      page.getByTestId("no-event-found").or(page.getByTestId("not-found-page")),
    ).toBeVisible({ timeout: 30_000 });
  });
});
