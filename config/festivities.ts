import type {
  FestivitySlug,
  FestivityType,
  FestivityWindow,
} from "types/festivity";
import { addDaysYmd, easterSundayYmd } from "@utils/date-helpers";

/**
 * The Nadal season: an event belongs to the season it starts in, from
 * 1 November to 10 January (so the Reis and late pessebres count).
 */
const nadalWindow = (seasonYear: number): FestivityWindow => ({
  from: `${seasonYear}-11-01`,
  to: `${seasonYear + 1}-01-10`,
});

/**
 * Carnaval moves with Easter: Ash Wednesday is Easter − 46 days. In 2026, 99%
 * of the acts fell from two weeks before Ash Wednesday to 13 days after it;
 * the earlier ones were sign-ups, workshops and poster launches.
 */
const carnavalWindow = (seasonYear: number): FestivityWindow => {
  const ashWednesday = addDaysYmd(easterSundayYmd(seasonYear), -46);
  return {
    from: addDaysYmd(ashWednesday, -14),
    to: addDaysYmd(ashWednesday, 13),
  };
};

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
    window: nadalWindow,
    leadDays: 0,
  },
  {
    slug: "pessebres-vivents",
    messageKey: "pessebresVivents",
    terms: ["pessebre"],
    include: /\bpessebres? vivents?\b/,
    exclude: NOT_THE_EVENT,
    yearOffset: 0,
    window: nadalWindow,
    leadDays: 0,
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
    window: nadalWindow,
    leadDays: 0,
  },
  {
    slug: "carnaval",
    messageKey: "carnaval",
    terms: ["carnaval", "carnestoltes", "rua"],
    // "Rua de Carnaval", "Gran Rua de lluïment", "Arribada del Rei
    // Carnestoltes", "Vermut Carnavaler". Not "escriptura" or "menstruació"
    // (the backend matches substrings), sign-ups anywhere in the title, or
    // Saint-Saëns' "El carnaval dels animals", played all year.
    include: /\b(carnaval\w*|carnestoltes|rua|rues)\b/,
    exclude: /^(recollida|lliurament|entrega|recull|taller)|\binscripci|\bcarnaval dels animals\b/,
    yearOffset: 0,
    window: carnavalWindow,
    // Links show from about mid-January, as towns announce their rues.
    leadDays: 21,
  },
];

export const FESTIVITY_SLUGS: readonly FestivitySlug[] = FESTIVITY_TYPES.map(
  (type) => type.slug,
);
