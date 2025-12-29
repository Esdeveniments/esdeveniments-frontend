import type { Page, BrowserContext } from "@playwright/test";

/**
 * NOTE: Service Workers are now blocked globally via playwright.config.ts
 * using `serviceWorkers: 'block'` in the project configuration.
 *
 * This file is kept for backward compatibility and documentation.
 * The functions below are no longer needed for tests that rely on route mocking.
 */

/**
 * @deprecated Service workers are now blocked globally in playwright.config.ts
 *
 * Blocks the service worker from loading and unregisters any existing SWs.
 * This allows Playwright's route handlers to intercept network requests.
 */
export async function unregisterServiceWorkers(_page: Page): Promise<void> {
  // No-op: SWs are blocked globally in playwright.config.ts
  // Keeping this function for backward compatibility
}

/**
 * @deprecated Service workers are now blocked globally in playwright.config.ts
 *
 * Alternative: Configure the entire browser context to block service workers.
 */
export async function blockServiceWorkersInContext(
  _context: BrowserContext
): Promise<void> {
  // No-op: SWs are blocked globally in playwright.config.ts
}
