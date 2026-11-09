import type { EventSummaryResponseDTO } from "types/api/event";
import type { NextEditionQuery } from "types/event";
import { foldForSearch } from "@utils/string-helpers";

// Upper-case Roman numerals ("XX Rua", "VII Festa") number an edition; folded
// text can't tell them from words, so they go first.
const ROMAN_RE = /\b[IVXLC]{2,}\b/g;
// Years and ordinals once folded: "2026", "54è" → "54e", "3r", "1a".
const NUMBER_RE = /\b\d+(?:a|e|er|r|n|t|o)?\b/g;
const EDITION_RE = /\b(?:edicio|edicion|edition)\b/g;

/**
 * The part of a title that stays the same from one edition to the next:
 * "54è Pessebre Vivent d’Osona 2025" → "pessebre vivent d osona". Null when
 * fewer than two words are left: "Carnestoltes" or "Concert" alone would
 * pair unrelated events.
 */
export function seriesKey(title: string): string | null {
  const key = foldForSearch(title.replace(ROMAN_RE, " "))
    .replace(NUMBER_RE, " ")
    .replace(EDITION_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  return key.split(" ").length >= 2 ? key : null;
}

// What changes between editions, in the raw title: "54è", "2026", "XX". Also
// apostrophes: titles mix ’ and ', and the term must match both.
const EDITION_PART_RE = /\b[IVXLC]{2,}\b|\d+\S*|\b(?:edició|edición|edition)\b|[’']/giu;

/**
 * The longest unchanged stretch of the title, as written: "54è Pessebre Vivent
 * d’Osona 2025" → "Pessebre Vivent d". The backend's `term` is a plain
 * substring match (accents and apostrophes count), so a folded key misses.
 */
export function seriesSearchTerm(title: string): string {
  return title
    .split(EDITION_PART_RE)
    .map((part) => part.replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, ""))
    .reduce((longest, part) => (part.length > longest.length ? part : longest), "");
}

/** The earliest other event with the same series key in the same town. */
export function pickNextEdition(
  event: NextEditionQuery,
  candidates: EventSummaryResponseDTO[],
): EventSummaryResponseDTO | null {
  const key = seriesKey(event.title);
  if (!key) return null;
  return (
    candidates
      .filter(
        (candidate) =>
          candidate.slug !== event.slug &&
          candidate.city?.slug === event.citySlug &&
          seriesKey(candidate.title) === key,
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null
  );
}
