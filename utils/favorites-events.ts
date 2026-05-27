/**
 * Window event dispatched when a logged-out visitor saves a favorite.
 * Consumed by FavoriteLoginNudge to show a one-per-session "sign in to
 * sync" prompt. Decouples the (many) FavoriteButton instances from the
 * single nudge mount point — no prop drilling, no shared context.
 */
export const GUEST_FAVORITE_SAVED_EVENT = "favorites:guest-saved";
