import { test, expect } from "@playwright/test";
import { MOCK_USER } from "./helpers/auth";
import { dismissEngagementPopups } from "./helpers/login";
import { DEFAULT_IMAGE, pickEventWhen } from "./helpers/publish";
import { readSavedDraft } from "./helpers/publish-draft";
import type { PublishDraftRecord } from "types/publish-draft";

for (const choice of ["guest", "account"]) {
  test(`step-three sign-in lets the user choose the ${choice} draft without silently replacing it`, async ({ page }, testInfo) => {
    await dismissEngagementPopups(page);
    let signedIn = false;
    let creates = 0;
    await page.route("**/api/auth/me", (route) => route.fulfill({
      status: signedIn ? 200 : 401,
      json: { user: signedIn ? { ...MOCK_USER, profileCompleted: true } : null },
    }));
    await page.route("**/api/regions/options", (route) => route.fulfill({ json: [
      { id: 1, name: "Maresme", slug: "maresme", cities: [
        { id: 2, value: "mataro", label: "Mataró", latitude: 41.54, longitude: 2.44 },
      ] },
    ] }));
    await page.route("**/api/categories", (route) => route.fulfill({ json: [{ id: 3, name: "Música", slug: "musica" }] }));
    await page.route("**/api/auth/sign-in?*", (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get("redirect")).toBe("/en/publica?resume=1");
      expect(url.searchParams.get("locale")).toBe("en");
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
    const original = await readSavedDraft(page);
    expect(original.form).toMatchObject({
      location: "Guest venue", town: { label: "Mataró" }, startDate: expect.stringContaining("12:30"),
      endDate: expect.stringContaining("14:45"),
      categories: [{ value: "3", label: "Música" }],
    });
    await page.evaluate(async (accountId) => {
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
            form: { title: "Older account basics", description: "Only step one from an earlier visit." }, image: null,
          }, `account:${accountId}`);
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error);
        });
      } finally { db.close(); }
    }, MOCK_USER.id);
    await expect(page.getByTestId("event-form")).toHaveAttribute("data-publish-armed", "true");
    await page.getByTestId("publish-button").click();
    await expect(page.getByTestId("draft-restore-guest")).toBeVisible();
    await expect(page.getByText("Previous account draft: Older account basics")).toBeVisible();
    expect(creates).toBe(0);
    await page.reload();
    await expect(page.getByTestId("draft-restore-guest")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("explicit-draft-choice.png") });
    if (choice === "guest") {
      await page.getByTestId("draft-restore-guest").click();
      await expect(page.getByTestId("preview-modal")).toBeVisible();
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
      expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      await expect(page.getByLabel("Start time", { exact: true })).toHaveValue("12:30");
      await expect(page.getByLabel("End time", { exact: true })).toHaveValue("14:45");
    } else {
      await page.getByRole("button", { name: "Restore the account's previous draft", exact: true }).click();
      await expect(page.locator("#title")).toHaveValue("Older account basics");
    }
    await expect(page.getByTestId("draft-restore-guest")).not.toBeVisible();
    await expect(page).not.toHaveURL(/resume=1/);
    expect(await page.evaluate(() => sessionStorage.getItem("publish-resume-v1"))).toBeNull();
    expect(creates).toBe(0);
    await page.screenshot({ path: testInfo.outputPath(`restored-${choice}-draft.png`) });
  });
}
