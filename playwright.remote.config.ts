import { defineConfig, devices } from "@playwright/test";

// Remote config to run against an existing deployed URL (e.g., Amplify Preview)
// IMPORTANT: Do not start a local webServer here

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";

const vercelBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const vercelBypassHeaders: Record<string, string> = vercelBypassSecret
  ? {
      "x-vercel-protection-bypass": vercelBypassSecret,
      "x-vercel-set-bypass-cookie": "true",
    }
  : {};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [
        ["blob"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
      ]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    navigationTimeout: 45000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "ca-ES",
    extraHTTPHeaders: {
      "accept-language": "ca",
      ...vercelBypassHeaders,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  expect: { timeout: 10000 },
});
