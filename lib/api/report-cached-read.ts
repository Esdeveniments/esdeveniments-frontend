import { captureException } from "@sentry/nextjs";

/**
 * Runs the body of a "use cache" function and reports a failure here, where
 * the error still has its message and stack. In production, what such a
 * function throws usually reaches its callers as "An error occurred in the
 * Server Components render": no message, no stack, only a digest. Reporting in
 * the caller therefore grouped every backend failure into one Sentry issue
 * nobody could read. The error is rethrown, so nothing is cached.
 */
export async function reportCachedReadFailure<T>(
  read: () => Promise<T>,
  context: Parameters<typeof captureException>[1],
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    captureException(error, context);
    throw error;
  }
}
