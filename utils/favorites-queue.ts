/**
 * Global request queue for favorite mutations.
 *
 * Serializes all favorite API calls to prevent race conditions when
 * multiple FavoriteButton instances fire concurrent requests.
 * Pattern used by Twitter, Airbnb for optimistic UI with reliable persistence.
 *
 * LIMITATION: This queue only serializes requests within a single browser tab.
 * Cross-tab race conditions are still possible if the user has multiple tabs open.
 * For a favorites feature, this trade-off is acceptable — multi-tab racing is rare
 * and the consequence (potentially losing one favorite) is low-stakes.
 * Full cross-tab sync would require server-side optimistic locking (ETag/version)
 * or BroadcastChannel coordination, which adds significant complexity.
 */

let pending: Promise<void> = Promise.resolve();

/**
 * Queues a favorite request to run after any in-flight requests complete.
 * Ensures sequential execution even across multiple component instances.
 *
 * @example
 * const response = await queueFavoriteRequest(() =>
 *   fetch('/api/favorites', { method: 'POST', body: ... })
 * );
 */
export function queueFavoriteRequest<T>(fn: () => Promise<T>): Promise<T> {
  const next = pending.then(fn, fn); // Always proceed, even after prior error
  pending = next.then(
    () => {},
    () => {}
  ); // Swallow result/error to keep chain clean
  return next;
}

/**
 * Resets the queue (useful for testing).
 */
export function resetFavoritesQueue(): void {
  pending = Promise.resolve();
}
