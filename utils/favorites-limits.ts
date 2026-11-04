// Dependency-free so a client component can import these numbers without
// utils/constants.ts. That file used to embed the full locale JSON files
// (~280KB), and importing it from FavoriteButton added +386KB on /preferits
// (bundle-size CI regression, 2026-07-31). It no longer does (see
// scripts/generate-locale-labels.mjs), but keep client imports this small.
export const MAX_FAVORITES = 10;
// Authenticated favourites are stored server-side with no real backend cap
// (verified against esdeveniments-backend/develop — UserFavoriteEventServiceImpl
// has no count check). This is a soft application limit used by the client guard
// and favorites page size, not a backend-enforced limit.
export const MAX_FAVORITES_AUTHENTICATED = 50;
