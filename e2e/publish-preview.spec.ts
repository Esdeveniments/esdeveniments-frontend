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
    await page.locator("input#title").pressSequentially(title, { delay: 50 });
    await page.locator("input#title").blur();

    await page
      .locator("textarea#description")
      .pressSequentially(desc, { delay: 20 });
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
    await page.screenshot({ path: test.info().outputPath("preview-ready.png") });

    // Close Modal
    await modal.getByLabel("Tanca").click();
    await expect(modal).toBeHidden();
  });
});
