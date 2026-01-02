import { test, expect } from "@playwright/test";

test.describe("Place Page Explore Navigation", () => {
  test("shows date and category links on base place page", async ({ page }) => {
    await page.goto("/barcelona");

    // Date badges should be visible
    await expect(page.getByText("Cerca per data")).toBeVisible();
    await expect(page.getByRole("link", { name: /avui/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /demà/i })).toBeVisible();

    // Category links should be visible
    await expect(page.getByText("Explora categories")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /fires i mercats/i })
    ).toBeVisible();
  });

  test("hides date badges when date is selected", async ({ page }) => {
    await page.goto("/barcelona/avui");

    // Date badges should be hidden (already filtered by date)
    await expect(page.getByText("Cerca per data")).not.toBeVisible();

    // Category links should still be visible
    await expect(page.getByText("Explora categories")).toBeVisible();
  });

  test("hides category links when category is selected", async ({ page }) => {
    await page.goto("/barcelona/musica");

    // Date badges should still be visible
    await expect(page.getByText("Cerca per data")).toBeVisible();

    // Category links should be hidden (already filtered by category)
    await expect(page.getByText("Explora categories")).not.toBeVisible();
  });

  test("hides entire section when fully filtered", async ({ page }) => {
    await page.goto("/barcelona/avui/musica");

    // Both should be hidden
    await expect(page.getByText("Cerca per data")).not.toBeVisible();
    await expect(page.getByText("Explora categories")).not.toBeVisible();
  });

  test("category links navigate to correct URLs", async ({ page }) => {
    await page.goto("/barcelona");

    // Click a category link
    const concertsLink = page.getByRole("link", { name: /concerts/i });
    await expect(concertsLink).toHaveAttribute("href", "/barcelona/musica");
  });

  test("date badges navigate to correct URLs", async ({ page }) => {
    await page.goto("/barcelona");

    const avuiLink = page.getByRole("link", { name: /avui/i });
    await expect(avuiLink).toHaveAttribute("href", "/barcelona/avui");
  });
});
