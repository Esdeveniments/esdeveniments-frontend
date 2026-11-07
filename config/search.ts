/**
 * Search suggestions config. The `GET /api/users?q=&size=` numbers mirror the
 * backend contract (Esdeveniments/esdeveniments-backend#59).
 */

/**
 * Profile suggestions need backend `GET /api/users?q=`, which doesn't exist
 * yet. While this is false the search box asks for no profiles and shows only
 * the free-text option and places. Turn it on once backend#59 is live.
 */
export const PROFILE_SEARCH_ENABLED = false;

/** Longest raw `q` the backend accepts (it answers 400 above it). */
export const SEARCH_QUERY_MAX_LENGTH = 100;
/** Words kept from a query, after dedupe. */
export const SEARCH_MAX_TOKENS = 8;
/** One-letter Catalan particles dropped from a query ("l'auditori" → "auditori"). */
export const SEARCH_PARTICLES: ReadonlySet<string> = new Set("ldsmntioyea");

export const USER_SEARCH_SIZE = { min: 1, max: 10, default: 5 } as const;

export const SEARCH_SUGGESTIONS_DEBOUNCE_MS = 250;
export const MAX_PLACE_SUGGESTIONS = 3;
/** Shortest folded query that may match a place with one typo. */
export const PLACE_TYPO_MIN_LENGTH = 5;
