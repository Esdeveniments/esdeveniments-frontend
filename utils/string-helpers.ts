/* =========================================================
 * String helpers (Catalan-aware)
 * ======================================================= */

import type {
  CatalanArticle,
  CatalanPhraseType,
  InstitutionArticle,
  NameRelation,
  PlacePhraseParts,
  PlacePhrases,
  PlacePhraseType,
  PlaceRelation,
  StringHelperLabels,
} from "types/common";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";
import localeLabels from "../i18n/locale-labels.generated.json";
import { sanitize, sanitizeLegacyApostrophe } from "./sanitize-segment";

const stringHelperLabels: StringHelperLabels = localeLabels.utils
  .StringHelpers as StringHelperLabels;
const {
  articles,
  prepositions,
  articlelessPlaces,
  feminineExceptions,
  masculineExceptions,
  institutionArticles,
} =
  stringHelperLabels;

export { sanitize, sanitizeLegacyApostrophe };

export const slug = (
  title: string,
  formattedStart: string,
  id: string
): string =>
  [sanitize(title), sanitize(formattedStart), id?.trim()]
    .filter(Boolean)
    .join("-");

/**
 * Simple slugify function that converts a string to a URL-friendly slug.
 * Lowercases, removes diacritics, and replaces non-alphanumeric characters with hyphens.
 * Returns empty string if result is empty (callers should provide fallbacks).
 * For more robust Catalan-aware slugification, use `sanitize()` instead.
 */
export function slugifySegment(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Capitalize first letter (safe) */
export function capitalizeFirstLetter(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Extract trailing UUID v4 (or fallback last dash segment) */
export const extractUuidFromSlug = (s: string): string => {
  const m = s.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  );
  return m ? m[0] : s.split("-").pop() ?? "";
};

export const truncateString = (str: string, num: number): string =>
  str.length <= num ? str : str.slice(0, num) + "...";

/** Cut at the last word boundary within `max` chars and end with "…". */
export function truncateAtWord(str: string, max: number): string {
  if (str.length <= max) return str;
  const cut = str.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:.–—-]+$/u, "")}…`;
}

/**
 * A location's comma-separated parts minus empty ones and any that is one of
 * `places` (case-insensitive): "Plaça Major, Vic, Osona" → "Plaça Major".
 */
export function dropPlaceParts(
  location: string,
  ...places: (string | null | undefined)[]
): string {
  const names = places.map((place) => place?.trim().toLowerCase());
  return location
    .replace(/\s+/g, " ")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !names.includes(part.toLowerCase()))
    .join(", ");
}

/**
 * Normalizes a string for search/filtering by removing accents and converting to lowercase.
 * Useful for case-insensitive and accent-insensitive text matching.
 * Example: "Premià" -> "premia", "Barcelona" -> "barcelona"
 */
export function normalizeForSearch(input: string): string {
  if (!input) return "";
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Letters NFKD doesn't split into base + mark.
const FOLD_LETTERS: Record<string, string> = {
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ø: "o",
  ł: "l",
  đ: "d",
};

/**
 * Folds text for search matching: lowercase, no accents, Catalan `l·l` → `ll`,
 * and every run of other characters → one space. Must match the backend's
 * `search_fold` (Esdeveniments/esdeveniments-backend#59).
 * Example: "L’Auditori" → "l auditori", "Col·lecció" → "colleccio".
 */
export function foldForSearch(input: string): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/[ßæœøłđ]/g, (char) => FOLD_LETTERS[char])
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/l[·.\u0140]+l/g, "ll")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Returns the place whose name (or slug) equals the search term after
 * `foldForSearch`, so "cardedeu" or "L’Hospitalet de Llobregat" go to the
 * place page. Prefixes don't match: "Castell" or "Gran" are often event words,
 * and a prefix used to send them to Castellví de Rosanes or Granollers.
 */
export function matchSearchToPlace(
  searchTerm: string,
  places: ReadonlyArray<{ label: string; value: string }>
): { label: string; value: string } | null {
  const folded = foldForSearch(searchTerm);
  if (folded.length < 2) return null;

  return (
    places.find(
      (place) =>
        foldForSearch(place.label) === folded ||
        foldForSearch(place.value) === folded,
    ) ?? null
  );
}

/* =========================================================
 * Catalan grammar helpers
 * ======================================================= */

const VOWEL_OR_H = /^[aeiouàáèéíïòóúüh]/i;
// No elision before a semivowel i/u ("de iogurt", "de Huelva", "el iaio").
const SEMIVOWEL_START = /^h?(?:i[aeouàèéòóú]|u[aeoàèéòó])/i;
const PLACE_PARTICLES = new Set(
  [...Object.values(prepositions), ...Object.values(articles), "i"].flatMap(
    (token) => {
      const lower = token.toLowerCase();
      const alt = lower.replace(/'/g, "’");
      return alt === lower ? [lower] : [lower, alt];
    }
  )
);
PLACE_PARTICLES.add("d'");
PLACE_PARTICLES.add("l'");

function capitalizeWord(word: string): string {
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

function formatPlaceToken(token: string, isFirst: boolean): string {
  if (!token) return token;

  // Preserve tokens that intentionally use multiple uppercase letters (acronyms, abbreviations)
  if (/[A-ZÀ-Ý]{2}/.test(token)) {
    return token;
  }

  const lower = token.toLowerCase();

  // Handle apostrophe-prefixed particles (d', l', …)
  const apostropheMatch = lower.match(/^([a-zà-ÿ]['’])(.*)$/);
  if (apostropheMatch) {
    const prefix = apostropheMatch[1];
    const rest = apostropheMatch[2];
    const prefixShouldStayLower = !isFirst && PLACE_PARTICLES.has(prefix);
    const formattedPrefix = prefixShouldStayLower
      ? prefix
      : capitalizeWord(prefix);
    const formattedRest = formatPlaceToken(rest, true);
    return `${formattedPrefix}${formattedRest}`;
  }

  // Handle hyphenated compounds by formatting each segment
  if (lower.includes("-")) {
    return lower
      .split("-")
      .map((part, idx) => formatPlaceToken(part, isFirst && idx === 0))
      .join(" ");
  }

  // Lowercase particles (except when first word), otherwise capitalize
  if (!isFirst && PLACE_PARTICLES.has(lower)) {
    return lower;
  }

  return capitalizeWord(lower);
}

/**
 * Format Catalan place names with proper capitalization:
 * - Capitalize significant words
 * - Keep particles/articles (de, del, d', la, etc.) lowercase unless first word
 * - Normalize hyphens to spaces and handle apostrophes (l', d', …)
 * Leaves acronyms (2+ consecutive uppercase letters) untouched.
 */
export function formatPlaceName(name: string): string {
  if (!name) return name;

  const normalized = name.trim();
  if (!normalized) return normalized;

  return normalized
    .split(/\s+/)
    .map((word, idx) => formatPlaceToken(word, idx === 0))
    .join(" ");
}

function startsWithVowelOrH(s: string): boolean {
  const text = (s || "").trim();
  return VOWEL_OR_H.test(text) && !SEMIVOWEL_START.test(text);
}

/** Capitalize first token, lowercase the rest; for one-word names, lowercase it. */
function narrativeRegionCase(name: string): string {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length <= 1) {
    const word = parts[0] ?? "";
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  const firstWord = parts[0];
  const capitalizedFirst =
    firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  return [capitalizedFirst, parts.slice(1).join(" ").toLowerCase()].join(" ");
}

/* ---------- Category/general heuristics (used when includeArticle = true) ---------- */

const FEMININE_EXCEPTIONS = feminineExceptions.map((e) => e.toLowerCase());

function classifyCategory(
  firstWord: string,
  full: string
): { plural: boolean; feminine: boolean } {
  const isPlural = /s$/i.test(firstWord);
  const stem = isPlural ? firstWord.slice(0, -1) : firstWord;

  const pluralCions = /cions$|sions$/i.test(firstWord);
  const feminineEndings = /a$|tat$|ció$|sió$|ina$|ena$|ura$|esa$/i;
  const masculineTraps = /(cinema|programa|tema)$/i;

  const isFeminine =
    FEMININE_EXCEPTIONS.some((e) => full.includes(e)) ||
    pluralCions ||
    (feminineEndings.test(stem) && !masculineTraps.test(stem));

  return { plural: isPlural, feminine: isFeminine };
}

/* ---------- Place phrases: preposition + place with article contraction ---------- */

const ELIDED_ARTICLE = articles.l.toLowerCase();
const LEADING_ARTICLE = /^(?:(els|el|les|la)\s+|(l)['’])(?=\S)/i;
const CATALAN_CONTRACTIONS: Record<
  "a" | "de",
  Record<Exclude<CatalanArticle, "l">, string>
> = {
  a: {
    el: prepositions.al,
    els: prepositions.als,
    la: prepositions.aLa,
    les: prepositions.aLes,
  },
  de: {
    el: prepositions.del,
    els: prepositions.dels,
    la: prepositions.deLa,
    les: prepositions.deLes,
  },
};
const PLACE_RELATION_PREPOSITIONS: Record<
  Exclude<AppLocale, "ca">,
  Record<PlaceRelation, string>
> = {
  es: { in: "en", of: "de", from: "desde" },
  en: { in: "in", of: "of", from: "from" },
};

/** "El Masnou" → { article: "el", rest: "Masnou" }; "L'Escala" → { article: "l", rest: "Escala" }. */
function splitCatalanArticle(name: string): {
  article: CatalanArticle | null;
  rest: string;
} {
  const match = LEADING_ARTICLE.exec(name);
  if (!match) return { article: null, rest: name };
  return {
    article: (match[1] ?? match[2]).toLowerCase() as CatalanArticle,
    rest: name.slice(match[0].length),
  };
}

/** Article a region takes in running text: "Maresme" → el, "Selva" → la, "Garrigues" → les. */
const ARTICLELESS_PLACES = new Set(articlelessPlaces);
const MASCULINE_EXCEPTIONS = new Set(
  masculineExceptions.map((e) => e.toLowerCase())
);

// Region names usually arrive without their article ("Maresme", "Anoia").
// An unaccented -es first word reads as plural ("Garrigues", "Terres de
// l'Ebre") unless it is a listed masculine singular ("Bages").
function inferRegionArticle(name: string): CatalanArticle | null {
  const lowerName = name.toLowerCase();
  if (!name || ARTICLELESS_PLACES.has(lowerName)) return null;
  const firstWord = name.split(/\s+/)[0];
  if (/[^èé]es$/i.test(firstWord) && !MASCULINE_EXCEPTIONS.has(lowerName)) {
    return /[ae]$/i.test(firstWord.slice(0, -1)) || isFemininePlaceName(name)
      ? "les"
      : "els";
  }
  if (startsWithVowelOrH(name)) return "l";
  return isFemininePlaceName(name) ? "la" : "el";
}

function casePlace(
  rest: string,
  type: CatalanPhraseType,
  article: CatalanArticle | null,
  lowercase: boolean
): string {
  if (!lowercase) return rest;
  if (type !== "region") return rest.toLowerCase();
  // Regions use narrative case; single-word feminine ones read fully lowercase ("a la selva")
  const narrative = narrativeRegionCase(rest);
  return !narrative.includes(" ") && (article === "la" || article === null)
    ? narrative.toLowerCase()
    : narrative;
}

/**
 * Single source for Catalan "a"/"de" + place. A leading article in the name
 * contracts ("El Masnou" → "al Masnou" / "del Masnou", "Els Prats de Rei" →
 * "als Prats de Rei", "L'Escala" → "a l'Escala"); regions without one get the
 * article they take in running text ("Maresme" → "al Maresme").
 */
function catalanPlaceParts(
  name: string,
  type: CatalanPhraseType,
  preposition: "a" | "de",
  lowercase: boolean,
  inferArticle: boolean = true
): PlacePhraseParts {
  const { article: ownArticle, rest } = splitCatalanArticle((name || "").trim());
  const article =
    ownArticle ??
    (type === "region" && inferArticle ? inferRegionArticle(rest) : null);
  const place = casePlace(rest, type, article, lowercase);

  if (article === "l") {
    return { preposition: prepositions[preposition], place: `${ELIDED_ARTICLE}${place}` };
  }
  if (article) {
    return { preposition: CATALAN_CONTRACTIONS[preposition][article], place };
  }
  const elide = preposition === "de" && startsWithVowelOrH(rest);
  return { preposition: elide ? "d'" : prepositions[preposition], place };
}

export function joinPlacePhrase({ preposition, place }: PlacePhraseParts): string {
  return preposition.endsWith("'")
    ? `${preposition}${place}`
    : `${preposition} ${place}`;
}

/**
 * Catalan contraction for the preposition "de".
 * - "town": "de Barcelona", "d'Arenys", "del Masnou", "de l'Escala"
 * - "region": with includeArticle, adds the article the region takes ("del Maresme")
 * - "category"/"general": if includeArticle=true, adds article with number/gender heuristics
 */
export function formatCatalanDe(
  name: string,
  lowercase: boolean = true,
  includeArticle: boolean = false,
  type: CatalanPhraseType = "category"
): string {
  if (type === "town" || type === "region" || !includeArticle) {
    return joinPlacePhrase(
      catalanPlaceParts(name, type, "de", lowercase, includeArticle)
    );
  }

  const raw = (name || "").trim();
  const text = lowercase ? raw.toLowerCase() : raw;
  const { del, dels, deLa, deLes, deL } = prepositions;

  const firstWord = text.split(/\s+/)[0];
  const { plural, feminine } = classifyCategory(firstWord, text);

  if (startsWithVowelOrH(firstWord)) {
    if (plural) return feminine ? `${deLes} ${text}` : `${dels} ${text}`;
    return `${deL}${text}`;
  }

  if (plural) return feminine ? `${deLes} ${text}` : `${dels} ${text}`;
  return feminine ? `${deLa} ${text}` : `${del} ${text}`;
}

/**
 * Catalan preposition "a" with article handling:
 * - "town": "a Barcelona", "al Masnou", "als Prats de Rei", "a la Garriga", "a l'Escala"
 * - "region": adds the article the region takes ("al Maresme", "a la Selva", "a l'Alt Empordà")
 * - "general": "a X", contracting only an article that is part of the name
 */
export function formatCatalanA(
  name: string,
  type: PlacePhraseType = "general",
  lowercase: boolean = true
): string {
  return joinPlacePhrase(catalanPlaceParts(name, type, "a", lowercase));
}

/**
 * Contracts "a"/"de" before a place name that starts with an article, in
 * Catalan text we don't write ourselves (backend news: "a El Masnou" →
 * "al Masnou", "A El Masnou," → "Al Masnou,", "de La Garriga" → "de la Garriga").
 */
export function contractCatalanPlaceInText(
  text: string,
  placeName: string | undefined
): string {
  if (typeof text !== "string" || typeof placeName !== "string") return text;
  const name = placeName.trim();
  if (!text || !name || !LEADING_ARTICLE.test(name)) return text;

  // Exact name; only the article's first letter may differ ("a el Masnou").
  const first = name[0];
  const namePattern =
    `[${first.toUpperCase()}${first.toLowerCase()}]` +
    escapeRegex(name.slice(1)).replace(/['’]/g, "['’]");
  const pattern = new RegExp(
    `(^|[^\\p{L}'’])([Aa]|[Dd]e) ${namePattern}(?![\\p{L}])`,
    "gu"
  );
  return text.replace(pattern, (_match, lead: string, preposition: string) => {
    const phrase =
      preposition.toLowerCase() === "a"
        ? formatCatalanA(name, "town", false)
        : formatCatalanDe(name, false, false, "town");
    const capitalized = preposition[0] !== preposition[0].toLowerCase();
    return lead + (capitalized ? capitalizeFirstLetter(phrase) : phrase);
  });
}

/**
 * Locale-aware preposition + place, split so UI can style the parts apart.
 * relation "in": ca a/al/a la…, es "en", en "in"
 * relation "of": ca de/del/d'…, es "de", en "of"
 * relation "from": ca des de/des del…, es "desde", en "from"
 * Spanish keeps "El Masnou" uncontracted: the article is part of the official name.
 */
export function formatPlacePrepositionParts(
  name: string,
  type: PlacePhraseType = "general",
  locale: AppLocale = DEFAULT_LOCALE,
  lowercase: boolean = true,
  relation: PlaceRelation = "in"
): PlacePhraseParts {
  if (locale === "ca") {
    const parts = catalanPlaceParts(
      name,
      type,
      relation === "in" ? "a" : "de",
      lowercase
    );
    return relation === "from"
      ? { ...parts, preposition: `des ${parts.preposition}` }
      : parts;
  }

  const raw = (name || "").trim();
  return {
    preposition: PLACE_RELATION_PREPOSITIONS[locale][relation],
    place: lowercase ? raw.toLowerCase() : raw,
  };
}

/** Locale-aware preposition + place as one phrase ("al Masnou", "en El Masnou", "in El Masnou"). */
export function formatPlacePreposition(
  name: string,
  type: PlacePhraseType = "general",
  locale: AppLocale = DEFAULT_LOCALE,
  lowercase: boolean = true,
  relation: PlaceRelation = "in"
): string {
  return joinPlacePhrase(
    formatPlacePrepositionParts(name, type, locale, lowercase, relation)
  );
}

/** All place placeholders used by messages, in display case. */
export function formatPlacePhrases(
  name: string,
  type: PlacePhraseType,
  locale: AppLocale
): PlacePhrases {
  const phrase = (relation: PlaceRelation) =>
    formatPlacePreposition(name, type, locale, false, relation);
  return {
    placeIn: phrase("in"),
    placeOf: phrase("of"),
    placeFrom: phrase("from"),
  };
}

const INSTITUTION_ARTICLES = new Map(Object.entries(institutionArticles));
const CATALAN_NAME_PREPOSITIONS: Record<
  NameRelation,
  Record<Exclude<InstitutionArticle, "l">, string> & { bare: string }
> = {
  of: { bare: prepositions.de, el: prepositions.del, la: prepositions.deLa },
  by: { bare: prepositions.per, el: prepositions.pel, la: prepositions.perLa },
};
const NAME_PREPOSITIONS: Record<
  Exclude<AppLocale, "ca">,
  Record<NameRelation, string>
> = {
  es: { of: "de", by: "por" },
  en: { of: "of", by: "by" },
};

/**
 * Locale-aware preposition + an organisation or person name, split so the
 * name alone can be a link. Catalan institutions named after a common noun
 * take a lowercase article ("de l'Ajuntament del Masnou", "pel Museu del
 * Joguet", "de la Biblioteca Can Fabra"). Other names only elide ("d'Òmnium",
 * "de Pau Riba"), and a brand's own article doesn't contract ("d'El Temps").
 */
export function formatNamePrepositionParts(
  name: string,
  locale: AppLocale = DEFAULT_LOCALE,
  relation: NameRelation = "of"
): PlacePhraseParts {
  const text = (name || "").trim();
  if (locale !== "ca") {
    return { preposition: NAME_PREPOSITIONS[locale][relation], place: text };
  }

  const forms = CATALAN_NAME_PREPOSITIONS[relation];
  const article = INSTITUTION_ARTICLES.get(text.split(/\s+/)[0].toLowerCase());
  if (article === "l") {
    return { preposition: forms.bare, place: `${ELIDED_ARTICLE}${text}` };
  }
  if (article) return { preposition: forms[article], place: text };
  const elide = relation === "of" && startsWithVowelOrH(text);
  return { preposition: elide ? "d'" : forms.bare, place: text };
}

/** "de l'Ajuntament del Masnou", "d'Òmnium"; es "de …", en "of …". */
export function formatNameOf(
  name: string,
  locale: AppLocale = DEFAULT_LOCALE
): string {
  return joinPlacePhrase(formatNamePrepositionParts(name, locale, "of"));
}

/**
 * Determines if a place name is feminine in Catalan using linguistic patterns.
 * (Heuristic; we special-case a few masculine exceptions.)
 */
function isFemininePlaceName(name: string): boolean {
  const lowerName = (name || "").toLowerCase();

  // Masculine exceptions that often match feminine-looking patterns
  if (MASCULINE_EXCEPTIONS.has(lowerName)) return false;

  // Feminine-ish endings
  const feminineSuffixes = [
    /a$/, // Selva, Noguera, Osona, Anoia…
    /ia$/, // Cerdanya
    /ona$/, // Tarragona
    /ena$/, // Noguera (stem), etc.
    /ina$/,
    /ura$/,
    /osa$/,
    /ció$/,
    /sió$/, // exposició (for categories)
    /xa$/, // Garrotxa
  ];

  return feminineSuffixes.some((p) => p.test(lowerName));
}
