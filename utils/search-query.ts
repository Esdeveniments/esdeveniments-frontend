import {
  MAX_PLACE_SUGGESTIONS,
  PLACE_TYPO_MIN_LENGTH,
  SEARCH_MAX_TOKENS,
  SEARCH_PARTICLES,
  SEARCH_QUERY_MAX_LENGTH,
} from "@config/search";
import { foldForSearch, matchSearchToPlace } from "@utils/string-helpers";
import type { Option } from "types/common";
import type { PlaceSearchEntry, SearchBoxSuggestion } from "types/search";

/**
 * Search tokens with the backend's rules (Esdeveniments/esdeveniments-backend#59):
 * fold, split, dedupe, keep the first 8, then drop 1-char Catalan particles.
 * Other 1-char tokens stay ("Sala B" → ["sala", "b"]).
 */
export function searchTokens(input: string): string[] {
  const folded = foldForSearch(input);
  if (!folded) return [];
  return [...new Set(folded.split(" "))]
    .slice(0, SEARCH_MAX_TOKENS)
    .filter((token) => token.length > 1 || !SEARCH_PARTICLES.has(token));
}

/** The backend searches only when one token has 2+ chars. */
export function hasSearchableToken(tokens: readonly string[]): boolean {
  return tokens.some((token) => token.length > 1);
}

/**
 * The folded `q` to send to `GET /api/users`, or null when the backend would
 * reject it (too long) or search nothing (no token of 2+ chars). Folding is
 * idempotent, so the backend gets the same tokens and exact-name ranking.
 */
export function toProfileSearchQuery(input: string): string | null {
  const folded = foldForSearch(input);
  if (folded.length > SEARCH_QUERY_MAX_LENGTH) return null;
  return hasSearchableToken(searchTokens(folded)) ? folded : null;
}

export function buildPlaceSearchIndex<T extends Option>(
  places: readonly T[],
): PlaceSearchEntry<T>[] {
  const seen = new Set<string>();
  const index: PlaceSearchEntry<T>[] = [];
  for (const place of places) {
    if (seen.has(place.value)) continue;
    seen.add(place.value);
    index.push({
      place,
      label: foldForSearch(place.label),
      value: foldForSearch(place.value),
    });
  }
  return index;
}

/**
 * True when `a` and `b` differ by at most one insert, delete, substitution or
 * swap of two adjacent letters (optimal string alignment distance ≤ 1).
 */
export function isWithinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const diff = a.length - b.length;
  if (Math.abs(diff) > 1) return false;
  let i = 0;
  while (a[i] === b[i]) i++;
  if (diff === 0) {
    return (
      a.slice(i + 1) === b.slice(i + 1) ||
      (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2))
    );
  }
  return diff > 0 ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

const startsWord = (text: string, query: string): boolean =>
  ` ${text}`.includes(` ${query}`);

/**
 * Up to `max` places for a typed query: exact name or slug first, then names
 * that start with it, then names with a word that starts with it ("cugat" →
 * Sant Cugat del Vallès). Only when none match and the query has 5+ chars,
 * names (or one of their words) within one typo ("Csrdedeu" → Cardedeu).
 */
export function suggestPlaces<T extends Option>(
  query: string,
  index: readonly PlaceSearchEntry<T>[],
  max: number = MAX_PLACE_SUGGESTIONS,
): T[] {
  const q = foldForSearch(query);
  if (q.length < 2) return [];

  const ranked: { entry: PlaceSearchEntry<T>; rank: number }[] = [];
  for (const entry of index) {
    const { label, value } = entry;
    const rank =
      label === q || value === q
        ? 0
        : label.startsWith(q) || value.startsWith(q)
          ? 1
          : startsWord(label, q) || startsWord(value, q)
            ? 2
            : -1;
    if (rank >= 0) ranked.push({ entry, rank });
  }

  if (ranked.length === 0 && q.length >= PLACE_TYPO_MIN_LENGTH) {
    for (const entry of index) {
      const candidates = q.includes(" ")
        ? [entry.label]
        : [entry.label, ...entry.label.split(" ")];
      if (candidates.some((candidate) => isWithinOneEdit(q, candidate))) {
        ranked.push({ entry, rank: 3 });
      }
    }
  }

  return ranked
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.entry.label.length - b.entry.label.length ||
        a.entry.label.localeCompare(b.entry.label),
    )
    .slice(0, max)
    .map(({ entry }) => entry.place);
}

/** DOM id of a suggestion option, for `aria-activedescendant`. */
export const suggestionDomId = (listboxId: string, suggestionId: string): string =>
  `${listboxId}-${suggestionId}`;

/**
 * The place a submitted search opens, if any: the picked place suggestion, or
 * with no suggestion picked, a place whose exact name was typed. A picked
 * "search events" option is always a text search.
 */
export function placeForSearch(
  value: string,
  places: readonly Option[],
  suggestion?: SearchBoxSuggestion,
): { label: string; value: string } | null {
  if (suggestion) return suggestion.type === "place" ? suggestion.place : null;
  return matchSearchToPlace(value, places);
}
