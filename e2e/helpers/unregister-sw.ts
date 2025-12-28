import type { Page } from "@playwright/test";

/**
 * Unregisters all service workers to prevent them from intercepting
 * network requests before Playwright's route handlers.
 * 
 * Call this BEFORE page.route() in tests that need to mock API responses.
 * Service Workers intercept fetch requests before Playwright's network layer,
 * so mocked routes won't work correctly if a SW is active.
 */
export async function unregisterServiceWorkers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Unregister any existing service workers
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
  });
}
