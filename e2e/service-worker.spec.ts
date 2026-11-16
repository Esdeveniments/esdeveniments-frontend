import { test, expect } from "@playwright/test";

// Most specs run with serviceWorkers: "block" so Playwright route mocks work.
// Opt in here so every PR exercises public/sw.js registration, cache hygiene,
// and RSC navigation bypass against a real browser service worker.
test.use({ serviceWorkers: "allow" });

test("service worker activates, skips caching /api/auth/me, and keeps client navigation working", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });

  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          if (!("serviceWorker" in navigator)) return "unsupported";
          const reg = await navigator.serviceWorker.getRegistration("/");
          return (
            navigator.serviceWorker.controller?.state ??
            reg?.active?.state ??
            "pending"
          );
        }),
      { timeout: 30_000 },
    )
    .toBe("activated");

  const authCached = await page.evaluate(async () => {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    await res.body?.cancel().catch(() => {});
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const match = await cache.match("/api/auth/me");
      if (match) return true;
    }
    return false;
  });
  expect(authCached).toBe(false);

  await page.goto("/catalunya", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(
    page.getByTestId("search-input").filter({ visible: true }),
  ).toBeVisible({ timeout: 30_000 });
});
