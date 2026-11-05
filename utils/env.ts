/**
 * Environment variable utilities
 *
 * Shared constants and helpers for environment detection
 */

/**
 * True when the app was built in E2E test mode. `NEXT_PUBLIC_E2E_TEST_MODE`
 * is inlined at build time, so the server and the browser agree as long as it
 * is set for `next build` (unset, the server still reads it at runtime). Use
 * this for anything that changes what renders (it disables analytics, ads and
 * popups in tests).
 */
export const isE2ETestBuild = process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1";

/**
 * Server-only: also true when only `E2E_TEST_MODE` is set at runtime, which
 * the browser never sees. Never use it to decide what renders: the server and
 * the browser would disagree and hydration fails (React #418).
 */
export const isE2ETestMode = isE2ETestBuild || process.env.E2E_TEST_MODE === "1";
