import { test, expect } from "@playwright/test";

test.describe("Canonical URL rules", () => {
  test("/place/tots redirects to /place and preserves query", async ({
    page,
  }) => {
    await page.goto("/barcelona/tots?search=castellers", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/barcelona(\?.*)?$/);
    expect(page.url()).toContain("search=castellers");
  });

  test("/place/tots/category redirects to /place/category", async ({
    page,
  }) => {
    await page.goto("/barcelona/tots/teatre", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/barcelona\/teatre$/);
  });

  test("Query params date/category normalize to canonical path", async ({
    page,
  }) => {
    await page.goto("/barcelona?category=teatre&date=tots", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/barcelona\/teatre(\?.*)?$/);
    expect(page.url()).not.toContain("category=");
    expect(page.url()).not.toContain("date=");
  });
});
