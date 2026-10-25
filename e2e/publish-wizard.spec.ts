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

  test("date picker on the last step is not hidden under the footer", async ({
    page,
  }) => {
    await page.goto("/publica", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await expect(page.getByTestId("event-form")).toHaveAttribute("data-hydrated", "true", {
      timeout: 30000,
    });

    await page.locator("input#title").fill("Concert de prova");
    await page
      .locator("textarea#description")
      .fill("Descripció de prova amb prou caràcters.");
    await page.getByTestId("next-button").click();
    const townSelect = page.getByTestId("town-select");
    await expect(townSelect).toBeVisible({ timeout: 15000 });
    await townSelect.click();
    await page.keyboard.type("Barcelona");
    await expect(townSelect.getByRole("option").first()).toContainText("Barcelona");
    await page.keyboard.press("Enter");
    await page.locator("#location").fill("Sala de prova");
    await page.locator("#categories").locator("..").click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await page.getByTestId("next-button").click();

    const startButton = page.getByRole("button", { name: /^(Start|Inici) \*:/ });
    const placeholder = page.getByRole("button", {
      name: /select date and time|seleccionar data i hora/i,
    });
    await expect(placeholder.or(startButton)).toBeVisible({ timeout: 15000 });
    if (await placeholder.isVisible()) await placeholder.focus();
    await startButton.click();
    const lastRowDay = page.locator(".rdp-form-wrapper .rdp-week").last().locator(".rdp-day").first();
    await expect(lastRowDay).toBeVisible();

    // Scroll with the wheel like a user. scrollIntoView, hover() and click()
    // would also scroll an overflow-hidden <main> and hide the clipping.
    const viewportHeight = page.viewportSize()!.height;
    // Move the mouse by coordinates: hover() would scroll the target into view.
    const startBox = (await startButton.boundingBox())!;
    await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
    await expect
      .poll(async () => {
        const box = await lastRowDay.boundingBox();
        if (box && box.y + box.height <= viewportHeight - 20) return true;
        await page.mouse.wheel(0, 200);
        return false;
      })
      .toBe(true);
    const lastRowOnTop = await lastRowDay.evaluate((cell) => {
      const box = cell.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return cell.contains(hit);
    });
    expect(lastRowOnTop, "last calendar row is covered by another element").toBe(true);
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
