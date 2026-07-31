// Deliberately dependency-free: utils/constants.ts imports the full locale
// JSON files at module scope (~280KB combined), which is fine for the
// server components that already pulled it in, but FavoriteButton is a
// client component and importing MAX_FAVORITES_AUTHENTICATED from
// @utils/constants there dragged that whole barrel into the client bundle
// for the first time — +386KB / +100% on /preferits, +384KB on /[locale]
// (bundle-size CI regression, 2026-07-31). Keep these two here so a client
// import stays a plain number, not the JSON payload.
export const MAX_FAVORITES = 10;
// Authenticated favourites are stored server-side with no real backend cap
// (verified against esdeveniments-backend/develop — UserFavoriteEventServiceImpl
// has no count check). This is a soft application limit used by the client guard
// and favorites page size, not a backend-enforced limit.
export const MAX_FAVORITES_AUTHENTICATED = 50;
