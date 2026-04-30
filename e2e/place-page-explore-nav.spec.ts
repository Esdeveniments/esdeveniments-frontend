import { test, expect } from "@playwright/test";

// Scope all link locators to their respective <nav> containers — using
// page-wide getByRole accidentally matches event card titles like
// "Concerts Maig 2026..." which makes these tests flaky as event data
// changes day to day. The nav aria-labels come from messages/ca.json:
// dateAriaLabel = "Filtra per data", categoryAriaLabel = "Navega per categories".
const dateNav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Filtra per data" }).first();
const categoryNav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Navega per categories" }).first();

test.describe("Place Page Explore Navigation", () => {
  test("shows date and category links on base place page", async ({ page }) => {
    await page.goto("/barcelona");

    // Date badges should be visible
    await expect(page.getByText("Cerca per data")).toBeVisible();
    await expect(dateNav(page).getByRole("link", { name: /avui/i })).toBeVisible();
    await expect(dateNav(page).getByRole("link", { name: /demà/i })).toBeVisible();

    // Category links should be visible
    await expect(page.getByText("Explora categories")).toBeVisible();
    await expect(
      categoryNav(page).getByRole("link", { name: /fires i mercats/i })
    ).toBeVisible();
  });

  test("hides date badges when date is selected", async ({ page }) => {
    await page.goto("/barcelona/avui");

    // Date badges should be hidden (already filtered by date)
    await expect(page.getByText("Cerca per data").first()).not.toBeVisible();

    // Category links should still be visible
    await expect(page.getByText("Explora categories").first()).toBeVisible();
  });

  test("shows other categories when category is selected", async ({ page }) => {
    await page.goto("/barcelona/musica");

    // Date badges should still be visible
    // Use .first() because PPR streaming may briefly render duplicate elements
    await expect(page.getByText("Cerca per data").first()).toBeVisible();

    // "Explora categories" heading replaced by "Altres categories a Barcelona"
    await expect(page.getByText("Explora categories").first()).not.toBeVisible();
    await expect(
      page.getByText(/Altres categories a Barcelona/i).first()
    ).toBeVisible();

    // The selected category (musica) should NOT appear in the category nav.
    // Scope to nav so event cards titled "Concerts ..." don't match.
    await expect(
      categoryNav(page).getByRole("link", { name: /concerts/i })
    ).not.toBeVisible();
  });

  test("hides date badges but shows other categories when fully filtered", async ({ page }) => {
    await page.goto("/barcelona/avui/musica");

    // Date badges hidden (already filtered by date)
    await expect(page.getByText("Cerca per data").first()).not.toBeVisible();

    // Other categories still shown for cross-linking
    await expect(page.getByText("Explora categories").first()).not.toBeVisible();
    await expect(
      page.getByText(/Altres categories a Barcelona/i).first()
    ).toBeVisible();
  });

  test("category links navigate to correct URLs", async ({ page }) => {
    await page.goto("/barcelona");

    // Click a category link inside the category nav (avoid event-card matches).
    const concertsLink = categoryNav(page).getByRole("link", {
      name: /concerts/i,
    });
    await expect(concertsLink).toHaveAttribute("href", "/barcelona/musica");
  });

  test("date badges navigate to correct URLs", async ({ page }) => {
    await page.goto("/barcelona");

    const avuiLink = dateNav(page).getByRole("link", { name: /avui/i });
    await expect(avuiLink).toHaveAttribute("href", "/barcelona/avui");
  });
});
