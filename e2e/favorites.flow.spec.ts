import { test, expect } from "@playwright/test";

function decodeCookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function parseFavoritesCookieValue(raw: string | undefined): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(decodeCookieValue(raw)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

test.describe("Favorites flow", () => {
  test.setTimeout(process.env.CI ? 120000 : 60000);

  test("clicking favorite button does not navigate", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });

    await expect(page.getByTestId("search-input")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    const firstEventLink = page
      .locator('a[href^="/e/"][data-analytics-event-slug]')
      .first();
    await expect(firstEventLink).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    const cardContainer = firstEventLink.locator(
      "xpath=ancestor::div[.//button[contains(translate(@aria-label,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'preferits')]][1]"
    );
    const favButton = cardContainer
      .getByRole("button", { name: /preferits/i })
      .first();
    await expect(favButton).toBeVisible({ timeout: 15000 });
    await expect(favButton).toBeEnabled({
      timeout: process.env.CI ? 60000 : 30000,
    });

    const urlBefore = page.url();
    await favButton.click();
    await expect(page).toHaveURL(urlBefore);
    await expect(page.getByTestId("search-input")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });
  });

  test("add favorite, see it on /preferits, persists after reload", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });

    const firstEventLink = page
      .locator('a[href^="/e/"][data-analytics-event-slug]')
      .first();
    await expect(firstEventLink).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    const href = await firstEventLink.getAttribute("href");
    expect(href).toBeTruthy();

    const slug = await firstEventLink.getAttribute("data-analytics-event-slug");
    expect(slug).toBeTruthy();

    const cardContainer = firstEventLink.locator(
      "xpath=ancestor::div[.//button[contains(translate(@aria-label,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'preferits')]][1]"
    );
    const favButton = cardContainer
      .getByRole("button", { name: /preferits/i })
      .first();

    await expect(favButton).toBeVisible({ timeout: 15000 });
    await expect(favButton).toBeEnabled({
      timeout: process.env.CI ? 60000 : 30000,
    });
    await expect(favButton).toHaveAttribute("aria-pressed", "false");

    await favButton.click();
    await expect(favButton).toHaveAttribute("aria-pressed", "true");

    await expect
      .poll(async () => {
        const cookies = await page.context().cookies();
        return cookies.some((c) => c.name === "user_favorites");
      })
      .toBe(true);

    await page.goto("/preferits", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i
    );

    await expect(page.getByTestId("favorites-page")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await expect(page.getByText(/esdeveniments futurs/i)).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });
    await expect(page.getByText(/automàticament/i)).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });
  });

  test("remove favorite, /preferits becomes empty state after reload", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });

    const firstEventLink = page
      .locator('a[href^="/e/"][data-analytics-event-slug]')
      .first();
    await expect(firstEventLink).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });

    const href = await firstEventLink.getAttribute("href");
    expect(href).toBeTruthy();

    const slug = await firstEventLink.getAttribute("data-analytics-event-slug");
    expect(slug).toBeTruthy();

    const cardContainer = firstEventLink.locator(
      "xpath=ancestor::div[.//button[contains(translate(@aria-label,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'preferits')]][1]"
    );
    const favButton = cardContainer
      .getByRole("button", { name: /preferits/i })
      .first();

    await expect(favButton).toBeEnabled({
      timeout: process.env.CI ? 60000 : 30000,
    });

    // Toggle ON
    await favButton.click();
    await expect(favButton).toHaveAttribute("aria-pressed", "true");

    // In CI the server action can keep the button disabled briefly.
    await expect(favButton).toBeEnabled({
      timeout: process.env.CI ? 60000 : 30000,
    });

    // Toggle OFF
    await favButton.click();
    await expect(favButton).toHaveAttribute("aria-pressed", "false");

    // Wait for the server action to finish; navigating too early can abort the request.
    await expect(favButton).toBeEnabled({
      timeout: process.env.CI ? 60000 : 30000,
    });

    await expect
      .poll(
        async () => {
          const cookies = await page.context().cookies();
          const favCookie = cookies.find((c) => c.name === "user_favorites");
          const parsed = parseFavoritesCookieValue(favCookie?.value);
          return parsed.includes(String(slug));
        },
        { timeout: process.env.CI ? 60000 : 30000 }
      )
      .toBe(false);

    await page.goto("/preferits", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await expect(page.getByTestId("no-events-found")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });
  });

  test("corrupted favorites cookie does not crash /preferits", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 });

    const origin = new URL(page.url()).origin;
    await page.context().addCookies([
      {
        name: "user_favorites",
        value: "not-json",
        url: origin,
      },
    ]);

    await page.goto("/preferits", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    await expect(page.getByTestId("no-events-found")).toBeVisible({
      timeout: process.env.CI ? 60000 : 30000,
    });
  });

  test("/preferits is noindex, nofollow", async ({ page }) => {
    await page.goto("/preferits", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/i);
    await expect(robots).toHaveAttribute("content", /nofollow/i);
  });
});
