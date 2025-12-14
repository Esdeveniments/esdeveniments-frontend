import { test, expect } from "@playwright/test";

test.describe("Publish - Preview", () => {
  test("shows preview modal with event details", async ({ page }) => {
    await page.goto("/publica", { waitUntil: "domcontentloaded" });

    // Wait for form to be ready
    await expect(page.getByTestId("event-form")).toBeVisible();
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

    // Explicitly wait for validation to clear
    await page.waitForTimeout(1000);

    const nextBtn = page.getByTestId("next-button");
    await expect(nextBtn).toBeEnabled({ timeout: 10000 });
    await nextBtn.click();

    // Step 2: Location
    await page.locator("#town-input").fill("Mataró");
    await page.keyboard.press("Enter");
    await page.fill("input#location", "Parc Central");
    await page.locator("input#location").blur();

    // Explicitly wait for validation to clear
    await page.waitForTimeout(1000);

    const nextBtn2 = page.getByTestId("next-button");
    await expect(nextBtn2).toBeEnabled({ timeout: 10000 });
    await nextBtn2.click();

    // Step 3: Dates & Image

    const previewButton = page.getByTestId("preview-button");
    await expect(previewButton).toBeVisible({ timeout: 20000 });
    await expect(previewButton).toBeEnabled({ timeout: 20000 });
    await previewButton.click();

    // Assert Modal
    const modal = page.getByRole("dialog", { name: "Preview" });
    await expect(modal).toBeVisible({ timeout: 20000 });

    // Assert Content
    await expect(modal).toContainText(title);
    await expect(modal).toContainText(desc);

    // Close Modal
    await modal.getByLabel("Tanca").click();
    await expect(modal).toBeHidden();
  });
});
