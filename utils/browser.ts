/**
 * Browser-specific utilities.
 * Only import these in client components ("use client").
 */

/**
 * Schedule a callback during browser idle time or fallback to setTimeout.
 * Returns a cleanup function.
 */
export function scheduleIdleCallback(
  callback: () => void,
  options?: { timeout?: number }
): () => void {
  if (
    typeof window !== "undefined" &&
    typeof window.requestIdleCallback === "function"
  ) {
    const id = window.requestIdleCallback(callback, options);
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(callback, options?.timeout ?? 100);
  return () => clearTimeout(id);
}
