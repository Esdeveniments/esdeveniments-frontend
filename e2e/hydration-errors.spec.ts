import { test, expect, type Page } from "@playwright/test";

// React reports a server/client HTML mismatch (#418), a server boundary that
// fell back to client rendering (#419), and its streaming script losing a
// placeholder ($RS: "reading 'parentNode'") as uncaught page errors. Each one
// throws away server HTML and re-renders that part of the page on the client.
const HYDRATION_ERROR =
  /Minified React error #41[89]|Hydration failed|reading 'parentNode'/;

async function waitForHydration(page: Page) {
  await page.waitForLoadState("load");
  // Each streamed boundary starts as <template id="B:n"> and is swapped out
  // when its content arrives. None left means the stream has finished.
  await page.waitForFunction(() => !document.querySelector('template[id^="B:"]'));
  for (let i = 0; i < 2; i++) {
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestIdleCallback(() => resolve(), { timeout: 5000 }),
        ),
    );
  }
}

// "/" used to throw #418 on some loads: its PPR resume reused boundary ids
// from the prerendered shell (vercel/next.js#94670), fixed in Next 16.3.
for (const path of ["/", "/catalunya", "/barcelona"]) {
  test(`${path} hydrates without React errors`, async ({ page }) => {
    // Two cold loads plus the waits; the 30 s default is too tight on previews.
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      if (HYDRATION_ERROR.test(error.message)) errors.push(error.message);
    });

    // These errors depend on stream timing, so load each page twice.
    for (let load = 0; load < 2; load++) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), `${path} responds 2xx`).toBe(true);
      await waitForHydration(page);
    }

    expect(errors, "React hydration or streaming errors").toEqual([]);
  });
}
