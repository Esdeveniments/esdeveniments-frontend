/**
 * Window event dispatched when a logged-out visitor saves a favorite.
 * Consumed by FavoriteLoginNudge to show a one-per-session "sign in to
 * sync" prompt. Decouples the (many) FavoriteButton instances from the
 * single nudge mount point — no prop drilling, no shared context.
 */
export const GUEST_FAVORITE_SAVED_EVENT = "favorites:guest-saved";

// Next keeps visited pages in its client cache (`staleTimes` in
// next.config.js), so a cached /preferits would miss a favorite toggled on
// another page. FavoriteButton marks the change; /preferits refreshes once
// when it is shown.
let favoritesChanged = false;

export function markFavoritesChanged(): void {
  favoritesChanged = true;
}

export function takeFavoritesChanged(): boolean {
  const changed = favoritesChanged;
  favoritesChanged = false;
  return changed;
}
