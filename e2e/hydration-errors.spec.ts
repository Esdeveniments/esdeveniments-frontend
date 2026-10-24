import { test, expect, type Page } from "@playwright/test";

// React reports a server/client HTML mismatch (#418), a server boundary that
// fell back to client rendering (#419), and its streaming script losing a
// placeholder ($RS: "reading 'parentNode'") as uncaught page errors. Each one
// throws away server HTML and re-renders that part of the page on the client.
const HYDRATION_ERROR =
  /Minified React error #41[89]|Hydration failed|reading 'parentNode'/;

async function waitForHydration(page: Page) {
  await page.waitForLoadState("load");
  for (let i = 0; i < 2; i++) {
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestIdleCallback(() => resolve(), { timeout: 5000 }),
        ),
    );
  }
}

for (const path of ["/", "/catalunya", "/barcelona"]) {
  test(`${path} hydrates without React errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      if (HYDRATION_ERROR.test(error.message)) errors.push(error.message);
    });

    // The home mismatch was intermittent, so load each page twice.
    for (let load = 0; load < 2; load++) {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await waitForHydration(page);
    }

    expect(errors, "React hydration or streaming errors").toEqual([]);
  });
}
