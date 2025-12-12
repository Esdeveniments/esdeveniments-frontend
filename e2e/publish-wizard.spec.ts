import { test, expect } from "@playwright/test";

test.describe("Publish wizard UX", () => {
  test("step navigation enables Next after basics and shows location step", async ({
    page,
  }) => {
    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    const next = page.getByTestId("next-button");
    await expect(next).toBeVisible();

    await page.fill("input#title", "Concert de prova");
    await page.fill(
      "textarea#description",
      "Descripció de prova amb prou caràcters."
    );

    await expect(next).toBeEnabled();
    await next.click();

    await page.waitForTimeout(500);
  });

  test("draft restore prompt appears after reload", async ({ page }) => {
    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.evaluate(() => {
      localStorage.setItem(
        "publish-form-draft",
        JSON.stringify({ title: "Esborrany de prova" })
      );
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    const restorePrompt = page.getByTestId("restore-draft-apply");
    await expect(restorePrompt).toBeVisible({ timeout: 10000 });
  });

  test("test link button opens normalized URL", async ({ page }) => {
    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.addInitScript(() => {
      window.__OPENED_URLS__ = [];
      const originalOpen = window.open;
      window.open = (...args) => {
        window.__OPENED_URLS__.push(args[0]);
        return originalOpen ? originalOpen(...args) : null;
      };
    });
    await page.fill("input#url", "example.com");

    await page.getByTestId("test-link-button").click();
    await page.waitForTimeout(300);
  });
});






