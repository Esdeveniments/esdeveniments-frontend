import type { FestivitySlug, FestivityType } from "types/festivity";

/**
 * The Nadal season: an event belongs to the season it starts in, from
 * 1 November to 10 January (so the Reis and late pessebres count).
 */
export const FESTIVITY_SEASON = { start: "11-01", end: "01-10" } as const;

/** A title prefix that is about taking part, not the event itself. */
const NOT_THE_EVENT = /^(inscripci|recollida|lliurament|entrega|recull|taller)/;

/** Sitemap and link order. Patterns run on normalizeForSearch(title). */
export const FESTIVITY_TYPES: readonly FestivityType[] = [
  {
    slug: "fires-de-nadal",
    messageKey: "firesDeNadal",
    terms: ["fira", "mercat", "mercadet"],
    // "Fira de Nadal", "Mercat artesà de Nadal", "Fira de Santa Llúcia",
    // "Fira de pessebres", "Mercat nadalenc". Not "Nadal al mercat setmanal".
    include:
      /\b(fira|fires|mercat|mercats|mercadet|mercadets)\b(?:\s+[\w'’]+){0,3}?\s+(nadal|nadalenc\w*|santa llucia|pessebres?)\b/,
    exclude: NOT_THE_EVENT,
    yearOffset: 0,
  },
  {
    slug: "pessebres-vivents",
    messageKey: "pessebresVivents",
    terms: ["pessebre"],
    include: /\bpessebres? vivents?\b/,
    exclude: NOT_THE_EVENT,
    yearOffset: 0,
  },
  {
    slug: "cavalcades-de-reis",
    messageKey: "cavalcadesDeReis",
    terms: ["cavalcada", "reis", "majestats"],
    // "Cavalcada de Reis", "Arribada de SS.MM. els Reis d'Orient". Not
    // "Carta als Reis", the Patge Reial or a carnival cavalcada.
    include:
      /\b(cavalcada|cavalcades|arribada|rebuda|desfilada)\b.{0,40}\b(reis|ss\.?\s?mm|majestats)\b/,
    exclude: NOT_THE_EVENT,
    yearOffset: 1,
  },
];

export const FESTIVITY_SLUGS: readonly FestivitySlug[] = FESTIVITY_TYPES.map(
  (type) => type.slug,
);
