import { test, expect, type Page } from "@playwright/test";

// Reads whichever element scrolls, so a regression to a <body> scroller
// (html/body overflow-x: hidden) shows up as a wrong position, not as 0.
const scrollTop = (page: Page) =>
  page.evaluate(() => Math.max(window.scrollY, document.body.scrollTop));

async function wheelToBottom(page: Page) {
  const { width, height } = page.viewportSize() ?? { width: 390, height: 844 };
  await page.mouse.move(width / 2, height / 2);
  let last = -1;
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(150);
    const now = await scrollTop(page);
    if (now === last) break;
    last = now;
  }
  // Let Chrome's smooth-wheel animation finish, or it keeps scrolling the
  // next page after navigation.
  await page.waitForTimeout(1000);
}

test.describe("Scroll position on navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  // Up to three page loads plus wheel loops; the default 30 s would cut off
  // the 90 s goto timeout on a cold preview deploy.
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    // Keep the follow-us popup from covering the page.
    await page.addInitScript(() =>
      localStorage.setItem(
        "social-follow-popup",
        JSON.stringify({ dismissCount: 99, lastDismissedAt: Date.now() })
      )
    );
  });

  test("opens the next page at the top after scrolling to the bottom", async ({
    page,
  }) => {
    await page.goto("/catalunya", { waitUntil: "domcontentloaded", timeout: 90000 });
    const homeLink = page.getByTestId("mobile-bottom-nav").locator('a[href="/"]');
    await expect(homeLink).toBeVisible({ timeout: 30000 });

    await wheelToBottom(page);
    expect(await scrollTop(page)).toBeGreaterThan(500);

    // Click by coordinates: locator.click() would scroll its own ancestor.
    const box = await homeLink.boundingBox();
    if (!box) throw new Error("Home link has no box");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForURL((url) => url.pathname === "/");

    await expect.poll(() => scrollTop(page), { timeout: 10000 }).toBe(0);
    await page.waitForTimeout(1500);
    expect(await scrollTop(page)).toBe(0);
  });

  test("restores the list position on Back", async ({ page }) => {
    await page.goto("/catalunya", { waitUntil: "domcontentloaded", timeout: 90000 });
    await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible({ timeout: 30000 });

    await page.mouse.move(195, 422);
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(1000);
    const listTop = await scrollTop(page);

    const card = await page.evaluate(() => {
      for (const a of document.querySelectorAll('a[href*="/e/"]')) {
        const r = a.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + Math.min(r.height / 2, 60);
        if (y > 200 && y < innerHeight - 150 && a.contains(document.elementFromPoint(x, y))) {
          return { x, y };
        }
      }
      return null;
    });
    test.skip(!card || listTop < 1000, "needs event data to scroll and click");
    if (!card) return;

    await page.mouse.click(card.x, card.y);
    await page.waitForURL((url) => url.pathname.includes("/e/"));
    await expect.poll(() => scrollTop(page), { timeout: 10000 }).toBe(0);

    await page.goBack();
    await page.waitForURL((url) => url.pathname === "/catalunya");
    await expect
      .poll(() => scrollTop(page), { timeout: 10000 })
      .toBeGreaterThan(listTop - 50);
  });
});
