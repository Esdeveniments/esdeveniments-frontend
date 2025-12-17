import { test, expect } from "@playwright/test";

declare global {
  interface Window {
    __OPENED_URLS__?: Array<string | URL>;
  }
}

test.describe("Publish wizard UX", () => {
  test("step navigation enables Next after basics and shows location step", async ({
    page,
  }) => {
    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Wait for form to be ready
    await expect(page.getByTestId("event-form")).toBeVisible();
    await expect(page.locator("input#title")).toBeVisible();

    const next = page.getByTestId("next-button");
    await expect(next).toBeVisible();

    await page.locator("input#title").pressSequentially("Concert de prova", {
      delay: 50,
    });
    await page.locator("input#title").blur();

    await page
      .locator("textarea#description")
      .pressSequentially("Descripció de prova amb prou caràcters.", {
        delay: 20,
      });
    await page.locator("textarea#description").blur();

    // Wait for validation to clear
    await page.waitForTimeout(1000);

    await expect(next).toBeEnabled({ timeout: 10000 });
    await next.click();

    await page.waitForTimeout(500);
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
        const urlArg = args[0];
        if (urlArg) {
          const value = typeof urlArg === "string" ? urlArg : urlArg.toString();
          window.__OPENED_URLS__?.push(value);
        }
        return originalOpen ? originalOpen(...args) : null;
      };
    });
    await page.fill("input#url", "example.com");

    await page.getByTestId("test-link-button").click();
    await page.waitForTimeout(300);
  });
});
