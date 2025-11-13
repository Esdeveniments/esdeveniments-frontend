import { test, expect } from "@playwright/test";

test.describe("Canonical URL rules", () => {
  test("/place/tots redirects to /place and preserves query", async ({
    page,
  }) => {
    // page.goto automatically follows redirects, use domcontentloaded for faster response
    await page.goto("/barcelona/tots?search=castellers", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    // Verify the redirect completed and query param is preserved
    // Use a longer timeout since the page might still be loading
    await expect(page).toHaveURL(/\/barcelona(\?.*)?$/, { timeout: 30000 });
    expect(page.url()).toContain("search=castellers");
  });

  test("/place/tots/category redirects to /place/category", async ({
    page,
  }) => {
    await page.goto("/barcelona/tots/teatre", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    // Verify the redirect completed
    await expect(page).toHaveURL(/\/barcelona\/teatre$/, { timeout: 30000 });
  });

  test("Query params date/category normalize to canonical path", async ({
    page,
  }) => {
    await page.goto("/barcelona?category=teatre&date=tots", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    // Verify the redirect completed and query params were normalized
    await expect(page).toHaveURL(/\/barcelona\/teatre(\?.*)?$/, {
      timeout: 30000,
    });
    expect(page.url()).not.toContain("category=");
    expect(page.url()).not.toContain("date=");
  });
});
