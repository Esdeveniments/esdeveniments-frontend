import { test, expect } from "@playwright/test";
import path from "node:path";
import { mockAuthenticatedUser } from "./helpers/auth";

test.describe("Publish - Preview", () => {
  // Publishing is gated behind auth — sign the session in before each test.
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await page.route("**/api/regions/options", (route) => route.fulfill({
      json: [{ id: 1, name: "Maresme", slug: "maresme", cities: [
        { id: 2, value: "mataro", label: "Mataró", latitude: 41.54, longitude: 2.44 },
      ] }],
    }));
  });

  test("saves pending edits when an internal link unmounts the form", async ({ page }) => {
    await page.goto("/publica");
    await expect(page.locator("input#title")).toBeEnabled();
    await page.clock.install();
    await page.locator("input#title").fill("Pending SPA draft");
    await page.locator('a[href="/"]').first().click();
    await expect(page).not.toHaveURL(/\/publica$/);
    await page.goto("/publica");
    await page.getByRole("button", { name: "Recupera esborrany" }).click();
    await expect(page.locator("input#title")).toHaveValue("Pending SPA draft");
  });

  test("lets conflicting tabs copy unsaved text without silently replacing either version", async ({ page, context }) => {
    await page.goto("/publica");
    await expect(page.locator("input#title")).toBeEnabled();
    const other = await context.newPage();
    await mockAuthenticatedUser(other);
    await other.goto("/publica");
    await other.locator("input#title").fill("Other tab draft");
    await expect(other.getByTestId("draft-save-status")).toHaveText("Desat en aquest dispositiu");
    await page.locator("input#title").fill("My unsaved text");
    await page.getByRole("button", { name: "Revisa l'esborrany desat" }).click();
    const title = page.locator("input#title");
    await expect(title).toBeEnabled();
    await title.focus();
    await expect(title).toBeFocused();
    await title.press("ControlOrMeta+A");
    expect(await title.evaluate((input: HTMLInputElement) =>
      input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0))).toBe("My unsaved text");
    await page.screenshot({ path: test.info().outputPath("conflict-copyable.png") });
    await page.getByRole("button", { name: "Recupera esborrany" }).click();
    await expect(title).toHaveValue("Other tab draft");
    await other.close();
  });

  test("shows preview modal with event details", async ({ page }) => {
    await page.goto("/publica", { waitUntil: "domcontentloaded" });

    // Wait for form to be ready
    await expect(page.getByTestId("event-form")).toBeVisible();
        await expect(page.getByTestId("event-form")).toHaveAttribute(
          "data-hydrated",
          "true",
          { timeout: 30000 }
        );
    await expect(page.locator("input#title")).toBeVisible();

    const title = "Esdeveniment amb Preview";
    const desc =
      "Descripció de l'esdeveniment de prova per validar la funcionalitat de preview.";

    // Step 1: Basics
    await page.locator("input#title").fill(title);
    await page.locator("input#title").blur();

    await page
      .locator("textarea#description")
      .fill(desc);
    await page.locator("textarea#description").blur();

    // Provide URL while still on basics step (field not visible later)
    await page.fill("input#url", "https://example.com");

    const nextBtn = page.getByTestId("next-button");
    await expect(nextBtn).toBeEnabled({ timeout: 10000 });
    await nextBtn.click();

    // Step 2: Location
    await page.locator("#town-input").fill("Mataró");
    await page.keyboard.press("Enter");
    await page.fill("input#location", "Parc Central");
    await page.locator("input#location").blur();

    const nextBtn2 = page.getByTestId("next-button");
    await expect(nextBtn2).toBeEnabled({ timeout: 10000 });
    await nextBtn2.click();

    // Step 3: Dates & Image
    await page.setInputFiles(
      'input[type="file"]',
      path.join(process.cwd(), "public/static/icons/icon-192x192.png"),
    );

    const previewButton = page.getByTestId("preview-button");
    await expect(previewButton).toBeVisible({ timeout: 20000 });
    await expect(previewButton).toBeEnabled({ timeout: 20000 });
    await previewButton.click();

    // Assert Modal
    const modal = page.getByTestId("preview-modal");
    await expect(modal).toBeVisible({ timeout: 20000 });

    // Assert Content
    await expect(modal).toContainText(title);
    await expect(modal).toContainText(desc);
    await expect(modal.locator('img[src^="data:image/"]')).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("preview-ready.png") });

    // Close Modal
    await modal.getByLabel("Tanca").click();
    await expect(modal).toBeHidden();
    await expect(page.getByTestId("draft-save-status")).toHaveText("Desat en aquest dispositiu");
    const storedImage = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("esdeveniments-publish-drafts", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const record = await new Promise<unknown>((resolve, reject) => {
          const request = db.transaction("drafts").objectStore("drafts")
            .get("account:550e8400-e29b-41d4-a716-446655440001");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        if (!record || typeof record !== "object" || !("image" in record)) throw new Error("Draft image missing");
        return record.image;
      } finally { db.close(); }
    });
    expect(storedImage).toMatchObject({ type: "image/png", name: expect.any(String), size: expect.any(Number) });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Recupera esborrany" })).toBeVisible();
    await expect(page.locator("input#title")).toHaveValue("");
    await page.getByRole("button", { name: "Recupera esborrany" }).click();
    await expect(page.locator("input#title")).toHaveValue(title);
    await expect(page.locator("textarea#description")).toHaveValue(desc);
    await page.fill("input#title", `${title} recuperat`);
    await page.getByTestId("next-button").click();
    await expect(page.locator("input#location")).toHaveValue("Parc Central");
    await page.getByTestId("next-button").click();
    await expect(page.getByTestId("preview-button")).toBeEnabled();
    await page.getByTestId("preview-button").click();
    await expect(modal).toContainText(`${title} recuperat`);
    const previewImage = modal.locator('img[src^="data:image/"]:visible').first();
    await expect(previewImage).toBeVisible();
    expect(await previewImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    const imageBounds = await previewImage.boundingBox();
    expect(imageBounds).not.toBeNull();
    expect(imageBounds!.width / imageBounds!.height).toBeCloseTo(16 / 9, 1);
    await page.screenshot({ path: test.info().outputPath("draft-restored-preview.png") });
    await modal.getByLabel("Tanca").click();
    await expect(modal).toBeHidden();
    await expect(page.getByTestId("draft-save-status")).toHaveText("Desat en aquest dispositiu");
    const other = await page.context().newPage();
    await mockAuthenticatedUser(other);
    await other.goto("/publica");
    await other.getByRole("button", { name: "Recupera esborrany" }).click();
    await other.locator("input#title").fill("Newer stored draft");
    await expect(other.getByTestId("draft-save-status")).toHaveText("Desat en aquest dispositiu");
    await page.getByTestId("prev-button").click();
    await page.getByTestId("prev-button").click();
    await page.locator("input#title").fill("Conflicting publication");
    await page.getByRole("button", { name: "Revisa l'esborrany desat" }).click();
    await page.getByTestId("next-button").click();
    await page.getByTestId("next-button").click();
    await expect(page.getByTestId("event-form")).toHaveAttribute("data-publish-armed", "true");
    await page.getByTestId("publish-button").click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Revisa l'esborrany desat i tria si el vols recuperar o descartar abans de publicar.",
    );
    await page.screenshot({ path: test.info().outputPath("conflict-publish-guidance.png") });
    await other.close();
  });
});
