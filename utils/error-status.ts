// Dependency-free on purpose: imported by auth code where pulling in
// api-error-handler (Sentry, NextResponse) would bloat the route bundles.
/**
 * Reads the HTTP status attached to a thrown error (e.g. via
 * `Object.assign(new Error(msg), { status })`). Returns undefined when absent
 * or not a number.
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }
  return typeof error.status === "number" ? error.status : undefined;
}

/**
 * True when a 401 error was thrown locally by `requireAuth` (missing or expired
 * session/refresh token) before any backend call was sent.
 */
export function isSessionAuthError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "authSource" in error &&
    error.authSource === "session"
  );
}
