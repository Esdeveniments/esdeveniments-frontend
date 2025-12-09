import path from "path";
import { defineConfig, devices } from "@playwright/test";

const host = process.env.HOST || "127.0.0.1";
const port = process.env.PORT || "3000";
const baseUrl =
  process.env.PLAYWRIGHT_TEST_BASE_URL || `http://${host}:${port}`;

// Ensure the spawned dev server inherits required env in CI without violating TS types
const webServerEnv: Record<string, string> = {
  NODE_ENV: process.env.NODE_ENV || "development",
  E2E_TEST_MODE: "1",
  NEXT_PUBLIC_E2E_TEST_MODE: "1",
  HOST: host,
  PORT: port,
};

// Ensure next-intl can locate the config file when running under Playwright
// webServerEnv.NEXT_INTL_CONFIG_PATH =
//   process.env.NEXT_INTL_CONFIG_PATH ||
//   path.join(__dirname, "next-intl.config.ts");
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
  retries: process.env.CI ? 1 : 0, // Reduced to 1 retry to avoid exceeding CI timeout
  workers: process.env.CI ? 2 : undefined, // Use 2 workers in CI for faster execution (conservative for remote URLs)
  maxFailures: process.env.CI ? 10 : undefined, // Fail fast in CI if too many tests fail
  timeout: process.env.CI ? 120000 : 60000, // Global test timeout: 120s in CI (remote URLs), 60s locally
  reporter: process.env.CI
    ? [["blob"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: baseUrl,
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
    url: baseUrl,
    reuseExistingServer: true,
    timeout: 120000,
    // Ensure the spawned dev server inherits required env in CI
    env: webServerEnv,
  },
  expect: { timeout: process.env.CI ? 20000 : 10000 },
  // Provide env to app server (Next.js) via process.env during CI start step.
  // In GitHub Actions we set NEXT_PUBLIC_API_URL; also export E2E_TEST_MODE to enable deterministic publish flow.
});
