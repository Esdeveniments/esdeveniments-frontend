import { defineConfig, devices } from "@playwright/test";

// Ensure the spawned dev server inherits required env in CI without violating TS types
const webServerEnv: Record<string, string> = {
  NODE_ENV: process.env.NODE_ENV || "development",
  E2E_TEST_MODE: "1",
};
if (process.env.NEXT_PUBLIC_API_URL) {
  webServerEnv.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;
}
if (process.env.HMAC_SECRET) {
  webServerEnv.HMAC_SECRET = process.env.HMAC_SECRET;
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: process.env.CI ? 120000 : 60000, // Global test timeout: 120s in CI (remote URLs), 60s locally
  reporter: process.env.CI
    ? [
        ["blob"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
      ]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    navigationTimeout: process.env.CI ? 120000 : 90000, // Higher timeout in CI for remote URLs
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "E2E_TEST_MODE=1 yarn dev",
    url: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
    // Ensure the spawned dev server inherits required env in CI
    env: webServerEnv,
  },
  expect: { timeout: process.env.CI ? 20000 : 10000 },
  // Provide env to app server (Next.js) via process.env during CI start step.
  // In GitHub Actions we set NEXT_PUBLIC_API_URL; also export E2E_TEST_MODE to enable deterministic publish flow.
});
