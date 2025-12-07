import { test, expect } from "@playwright/test";

test.describe("News pages", () => {
  test("news index renders and RSS endpoint responds", async ({
    page,
    request,
  }) => {
    await page.goto("/noticies", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Notícies", level: 1 })
    ).toBeVisible();

    // Global news RSS
    const rss = await request.get("/noticies/rss.xml");
    expect(rss.status()).toBe(200);
    const text = await rss.text();
    expect(text).toContain("<?xml");
  });

  test("place news page renders basic elements and place RSS responds", async ({
    page,
    request,
  }) => {
    // Choose a commonly present hub like barcelona; if backend returns empty, page may 404 -> handle both
    await page.goto("/noticies/barcelona", { waitUntil: "domcontentloaded" });
    if ((await page.locator("h1:has-text('Notícies de')").count()) > 0) {
      await expect(
        page.locator("h1:has-text('Notícies de')").first()
      ).toBeVisible();
    } else {
      await expect(page.getByTestId("not-found-title")).toBeVisible();
    }

    const rss = await request.get("/noticies/barcelona/rss.xml");
    expect(rss.status()).toBe(200);
  });
});
