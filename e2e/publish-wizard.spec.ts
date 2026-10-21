import { test, expect } from "@playwright/test";
import { mockAuthenticatedUser } from "./helpers/auth";

declare global {
  interface Window {
    __OPENED_URLS__?: Array<string | URL>;
  }
}

test.describe("Publish wizard UX", () => {
  // Publishing is gated behind auth — sign the session in before each test.
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test("step navigation enables Next after basics and shows location step", async ({
    page,
  }) => {
    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Wait for form to be ready
    await expect(page.getByTestId("event-form")).toBeVisible();
      await expect(page.getByTestId("event-form")).toHaveAttribute(
        "data-hydrated",
        "true",
        { timeout: 30000 }
      );
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

    await expect(next).toBeEnabled({ timeout: 10000 });
    await next.click();
  });

  test("test link button opens normalized URL", async ({ page }) => {
    // Init scripts run on the next navigation, so stub window.open before it.
    await page.addInitScript(() => {
      window.__OPENED_URLS__ = [];
      window.open = (...args) => {
        const urlArg = args[0];
        if (urlArg) {
          const value = typeof urlArg === "string" ? urlArg : urlArg.toString();
          window.__OPENED_URLS__?.push(value);
        }
        return null;
      };
    });
    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await expect(page.getByTestId("event-form")).toHaveAttribute("data-hydrated", "true", {
      timeout: 30000,
    });
    await page.fill("input#url", "example.com");

    await page.getByTestId("test-link-button").click();
    await expect
      .poll(() => page.evaluate(() => window.__OPENED_URLS__))
      .toEqual(["https://example.com"]);
  });
});
