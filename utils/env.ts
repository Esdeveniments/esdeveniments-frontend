/**
 * Environment variable utilities
 * 
 * Shared constants and helpers for environment detection
 */

/**
 * Detects if the application is running in E2E test mode.
 * 
 * Disables analytics and other external services to prevent test traffic
 * from polluting production data.
 * 
 * Checks both server-side (E2E_TEST_MODE) and client-side
 * (NEXT_PUBLIC_E2E_TEST_MODE) environment variables.
 */
export const isE2ETestMode =
  process.env.E2E_TEST_MODE === "1" ||
  process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1";

