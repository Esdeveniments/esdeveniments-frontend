import { test, expect } from "@playwright/test";

// Most specs run with serviceWorkers: "block" so Playwright route mocks work.
// Opt in here so every PR exercises public/sw.js registration, cache hygiene,
// and RSC navigation bypass against a real browser service worker.
test.use({ serviceWorkers: "allow" });

test("service worker controls the page, precaches the offline shell, and lets client RSC navigation through", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });

  await expect
    .poll(
      () => page.evaluate(() => navigator.serviceWorker.controller?.state ?? "uncontrolled"),
      { timeout: 30_000 },
    )
    .toBe("activated");

  const offlinePrecached = await page.evaluate(async () => {
    const match = await caches.match("/offline", { ignoreSearch: true });
    return match?.status === 200;
  });
  expect(offlinePrecached).toBe(true);

  await page.evaluate(() => {
    (window as unknown as Record<string, number>).__swClientNavMarker = 1;
  });

  const rscLink = page.locator('a[href="/catalunya/cap-de-setmana"]').first();
  await expect(rscLink).toBeVisible({ timeout: 30_000 });
  await rscLink.click();
  await page.waitForURL("**/catalunya/cap-de-setmana", { timeout: 30_000 });

  await expect(
    page.getByTestId("search-input").filter({ visible: true }),
  ).toBeVisible({ timeout: 30_000 });

  const markerSurvived = await page.evaluate(
    () => (window as unknown as Record<string, number>).__swClientNavMarker === 1,
  );
  expect(markerSurvived).toBe(true);
  expect(pageErrors).toEqual([]);
});
