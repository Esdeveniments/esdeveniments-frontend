import { test, expect } from "@playwright/test";
import { MOCK_USER } from "./helpers/auth";
import { dismissEngagementPopups } from "./helpers/login";
import { DEFAULT_IMAGE, pickEventWhen } from "./helpers/publish";
import { readSavedDraft, replaceDraftFence } from "./helpers/publish-draft";
import type { PublishDraftRecord } from "types/publish-draft";
import { PUBLISH_DRAFT_TTL_MS } from "@utils/constants";

for (const choice of ["empty-account", "guest", "account", "untitled-account", "incomplete-profile", "expired-account", "corrupt-account", "invalid-fence", "competing-write"]) {
  test.describe(`step-three sign-in with ${choice}`, () => {
    let creates = 0;
    let original: Awaited<ReturnType<typeof readSavedDraft>>;
    test.beforeEach(async ({ page }) => {
      await dismissEngagementPopups(page);
      let signedIn = false;
      let profileComplete = choice !== "incomplete-profile";
      creates = 0;
      await page.route("**/api/auth/me", (route) => route.fulfill({
        status: signedIn ? 200 : 401,
        json: { user: signedIn ? { ...MOCK_USER, profileCompleted: profileComplete } : null },
      }));
      await page.route("**/api/regions/options", (route) => route.fulfill({ json: [
        { id: 1, name: "Maresme", slug: "maresme", cities: [
          { id: 2, value: "mataro", label: "Mataró", latitude: 41.54, longitude: 2.44 },
        ] },
      ] }));
      await page.route("**/api/categories", (route) => route.fulfill({ json: [{ id: 3, name: "Música", slug: "musica" }] }));
      await page.route("**/api/users/me/profile", (route) => {
        profileComplete = true;
        return route.fulfill({ json: {} });
      });
      await page.route("**/api/auth/sign-in?*", async (route) => {
        const url = new URL(route.request().url());
        expect(url.searchParams.get("redirect")).toBe("/en/publica?resume=1");
        expect(url.searchParams.get("locale")).toBe("en");
        if (choice === "invalid-fence") {
          const storageTab = await page.context().newPage();
          try {
            await storageTab.route("**/draft-storage-fixture", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html>" }));
            await storageTab.goto("/draft-storage-fixture");
            await replaceDraftFence(storageTab, 2);
          } finally { await storageTab.close(); }
        }
        signedIn = true;
        return route.fulfill({ status: 302, headers: { location: "/en/publica?resume=1&auth_success=1" } });
      });
      await page.route("**/en/publica", (route) => {
        if (route.request().method() !== "POST") return route.continue();
        creates++;
        return route.abort();
      });
      await page.goto("/en/publica");
      await page.locator("#title").fill("New guest event");
      await page.locator("#description").fill("Guest description across all three steps.");
      await page.getByTestId("next-button").click();
      await page.locator("#town-input").fill("Mataró");
      await page.keyboard.press("Enter");
      await page.locator("#location").fill("Guest venue");
      await page.locator("#categories").locator("..").click();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.keyboard.press("Escape");
      await page.getByTestId("next-button").click();
      await page.setInputFiles('input[type="file"]', DEFAULT_IMAGE);
      await pickEventWhen(page, { startTime: "12:30", endTime: "14:45" });
      await expect(page.getByTestId("draft-save-status")).toHaveText("Saved on this device");
      original = await readSavedDraft(page);
      expect(original.form).toMatchObject({
        location: "Guest venue", town: { label: "Mataró" }, startDate: expect.stringContaining("12:30"),
        endDate: expect.stringContaining("14:45"),
        categories: [{ value: "3", label: "Música" }],
      });
      await page.evaluate(async ({ accountId, scenario, ttl }) => {
        if (scenario === "empty-account") return;
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const open = indexedDB.open("esdeveniments-publish-drafts");
          open.onsuccess = () => resolve(open.result);
          open.onerror = () => reject(open.error);
        });
        try {
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction("drafts", "readwrite");
            const store = tx.objectStore("drafts");
            const read: IDBRequest<PublishDraftRecord> = store.get("guest");
            read.onsuccess = () => store.put({
              ...read.result, owner: { kind: "account", accountId },
              form: { title: scenario === "untitled-account" ? "" : "Older account basics",
                description: "Only step one from an earlier visit." }, image: null,
              updatedAt: scenario === "expired-account" ? Date.now() - ttl : read.result.updatedAt,
              version: scenario === "corrupt-account" ? 2 : read.result.version,
            }, `account:${accountId}`);
            tx.oncomplete = () => resolve();
            tx.onabort = () => reject(tx.error);
          });
        } finally { db.close(); }
      }, { accountId: MOCK_USER.id, scenario: choice, ttl: PUBLISH_DRAFT_TTL_MS });
    });
    test("preserves every step and requires an explicit publication", async ({ page }, testInfo) => {
      await expect(page.getByTestId("event-form")).toHaveAttribute("data-publish-armed", "true");
      await page.getByTestId("publish-button").click();
      if (choice !== "empty-account" && choice !== "expired-account" && choice !== "invalid-fence") {
        await expect(page.getByTestId("draft-restore-guest")).toBeVisible();
        if (choice !== "corrupt-account") {
          await expect(page.getByText(`Previous account draft: ${choice === "untitled-account" ? "No title" : "Older account basics"}`)).toBeVisible();
        } else {
          await expect(page.getByTestId("publish-draft-panel").getByRole("alert")).toBeVisible();
          await expect(page.getByTestId("draft-restore-guest")).toBeEnabled();
        }
        expect(creates).toBe(0);
        await page.reload();
        await expect(page.getByTestId("draft-restore-guest")).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath("explicit-draft-choice.png") });
      }
      if (choice === "invalid-fence") {
        await expect(page.getByTestId("publish-draft-panel").getByRole("alert")).toBeVisible();
        await expect(page.getByTestId("draft-restore-guest")).not.toBeVisible();
        await page.getByRole("button", { name: "Discard", exact: true }).click();
        await page.getByTestId("draft-discard-modal").getByRole("button", { name: "Discard", exact: true }).click();
        await expect(page.getByTestId("draft-discard-modal")).not.toBeVisible();
        expect(await readSavedDraft(page)).toEqual(original);
        await expect(page.getByTestId("preview-modal")).not.toBeVisible();
      } else if (choice === "competing-write") {
        await replaceDraftFence(page);
        await page.getByTestId("draft-restore-guest").click();
        await expect(page.getByTestId("publish-draft-panel").getByRole("alert")).toBeVisible();
        await expect(page.getByTestId("preview-modal")).not.toBeVisible();
      } else if (choice !== "account" && choice !== "untitled-account") {
        if (choice !== "empty-account" && choice !== "expired-account") {
          await page.getByTestId("draft-restore-guest").click();
        }
        await expect(page.getByTestId("preview-modal")).toBeVisible();
        if (choice === "incomplete-profile") {
          await page.getByTestId("preview-modal-action-button").click();
          await expect(page).toHaveURL(/\/en\/perfil\/edita/);
          await page.locator("#displayName").fill("Test User");
          await page.getByRole("button", { name: "Save changes", exact: true }).click();
          await expect(page.getByTestId("preview-modal")).toBeVisible();
          await expect(page.getByTestId("preview-modal-action-button")).toHaveText("Publish");
        }
        expect(await readSavedDraft(page, MOCK_USER.id)).toEqual(original);
        await page.getByTestId("preview-modal").getByLabel("Tanca").click();
        await expect(page.locator("#title")).toHaveValue("New guest event");
        await page.getByTestId("next-button").click();
        await expect(page.getByTestId("town-select")).toContainText("Mataró");
        await expect(page.locator("#location")).toHaveValue("Guest venue");
        await expect(page.getByText("Música", { exact: true })).toBeVisible();
        await page.getByTestId("next-button").click();
        const image = page.locator('main img[src^="data:image/"]').first();
        await expect(image).toBeVisible();
        await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
        await expect(page.getByLabel("Start time", { exact: true })).toHaveValue("12:30");
        await expect(page.getByLabel("End time", { exact: true })).toHaveValue("14:45");
      } else {
        await page.getByRole("button", { name: "Restore the account's previous draft", exact: true }).click();
        await expect(page.locator("#title")).toHaveValue(choice === "untitled-account" ? "" : "Older account basics");
        expect(await readSavedDraft(page, undefined, "guest")).toEqual(original);
      }
      await expect(page.getByTestId("draft-restore-guest")).not.toBeVisible();
      await expect(page).not.toHaveURL(/resume=1/);
      expect(await page.evaluate(() => sessionStorage.getItem("publish-resume-v1"))).toBeNull();
      expect(creates).toBe(0);
      await page.screenshot({ path: testInfo.outputPath(`restored-${choice}-draft.png`) });
    });
  });
}
