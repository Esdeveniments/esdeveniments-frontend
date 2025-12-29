/* =========================================================
 * String helpers (Catalan-aware)
 * ======================================================= */

import type { StringHelperLabels } from "types/common";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";
import caMessages from "../messages/ca.json";
import { sanitize, sanitizeLegacyApostrophe } from "./sanitize-segment";

const stringHelperLabels: StringHelperLabels = (caMessages as any).Utils
  .StringHelpers as StringHelperLabels;
const { articles, prepositions, feminineExceptions, masculineExceptions } =
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

/** Extract trailing UUID v4 (or fallback last dash segment) */
export const extractUuidFromSlug = (s: string): string => {
  const m = s.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  );
  return m ? m[0] : s.split("-").pop() ?? "";
};

export const truncateString = (str: string, num: number): string =>
  str.length <= num ? str : str.slice(0, num) + "...";

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

/**
 * Normalizes a URL input by automatically adding https:// protocol if missing.
 * Handles common URL formats:
 * - "example.com" -> "https://example.com"
 * - "www.example.com" -> "https://www.example.com"
 * - "https://example.com" -> "https://example.com" (unchanged)
 * - "http://example.com" -> "http://example.com" (unchanged)
 * - "" -> "" (empty string preserved)
 *
 * @param url - The URL string to normalize
 * @returns Normalized URL with protocol, or empty string if input is empty/whitespace
 */
export function normalizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  // If already has protocol, return as-is
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Add https:// protocol if missing, unless it's localhost (allow http)
  if (trimmed.startsWith("localhost") || trimmed.includes("://localhost")) {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `http://${trimmed}`;
  }

  return `https://${trimmed}`;
}

/* =========================================================
 * Catalan grammar helpers
 * ======================================================= */

const VOWEL_OR_H = /^[aeiouàáèéíïòóúüh]/i;
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
  return VOWEL_OR_H.test((s || "").trim());
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

/**
 * Catalan contraction for the preposition "de".
 * - type "town": never injects articles; returns "de X" / "d'X"
 * - type "region": heuristic handling for plural vs singular and gender
 * - "category"/"general": if includeArticle=true, adds article with number/gender heuristics
 */
export function formatCatalanDe(
  name: string,
  lowercase: boolean = true,
  includeArticle: boolean = false,
  type: "category" | "region" | "town" | "general" = "category"
): string {
  const raw = (name || "").trim();
  const text = lowercase ? raw.toLowerCase() : raw;
  const { de, del, dels, deLa, deLes, deL } = prepositions;

  // ---- towns: keep simple (your tests expect only "de"/"d'")
  if (type === "town") {
    return startsWithVowelOrH(text) ? `d'${text}` : `${de} ${text}`;
  }

  // ---- regions: plural detection + gender heuristic (no external table required)
  if (type === "region") {
    if (!includeArticle) {
      return startsWithVowelOrH(text) ? `d'${text}` : `${de} ${text}`;
    }

    const firstWord = text.split(/\s+/)[0];
    const fwLower = firstWord.toLowerCase();

    // True plural only if ends in unaccented -es; exclude singular -ès/-és
    const regionIsPlural =
      /s$/i.test(firstWord) &&
      firstWord.length > 2 &&
      /[^èé]es$/i.test(fwLower);

    if (regionIsPlural) {
      // Feminine plural guess: stems ending in -a/-e or overall feminine pattern
      const stem = firstWord.slice(0, -1);
      const isFemPl = /a$|e$/i.test(stem) || isFemininePlaceName(text);
      return isFemPl ? `${deLes} ${text}` : `${dels} ${text}`;
    }

    if (startsWithVowelOrH(firstWord)) return `${deL}${text}`;
    return isFemininePlaceName(text) ? `${deLa} ${text}` : `${del} ${text}`;
  }

  // ---- categories / general nouns
  if (!includeArticle) {
    return startsWithVowelOrH(text) ? `d'${text}` : `${de} ${text}`;
  }

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
 * Catalan preposition "a" with proper article handling.
 * - "town": always "a <town>" (your tests assert this)
 * - "region": narrative case + correct articles:
 *     - plural: "a les … / als …"
 *     - singular vowel/h: "a l’…"
 *     - singular feminine consonant: "a La …" (capital La)
 *     - singular masculine consonant: "al …"
 */
export function formatCatalanA(
  name: string,
  type: "region" | "town" | "general" | "" = "general",
  lowercase: boolean = true
): string {
  const raw = (name || "").trim();
  const text = lowercase ? raw.toLowerCase() : raw;
  const normalizedType = type === "" ? ("general" as const) : type;
  const { a, al, als, aLa, aLes, aL } = prepositions;

  if (normalizedType === "town") {
    return `${a} ${text}`;
  }

  if (normalizedType === "region") {
    // Handle empty string early
    if (!raw) {
      return `${a} `;
    }

    // Special-case proper name that does not take an article in Catalan
    // e.g., "Catalunya" → "a Catalunya" (never "a la Catalunya")
    if ((raw || "").trim().toLowerCase() === "catalunya") {
      return lowercase ? `${a} catalunya` : `${a} Catalunya`;
    }

    // Respect requested casing:
    // - when lowercase=true → narrative/lowercased style (phrase = narrativeRegionCase)
    // - when lowercase=false → preserve original casing (phrase = raw)
    const display = lowercase ? text : raw;
    const phrase = lowercase ? narrativeRegionCase(display) : display;

    // Quick plural detection for regions (same rule as above)
    const firstWord = (display || "").split(/\s+/)[0];
    const fwLower = firstWord.toLowerCase();
    const regionIsPlural =
      /s$/i.test(firstWord) &&
      firstWord.length > 2 &&
      /[^èé]es$/i.test(fwLower);

    if (regionIsPlural) {
      const stem = firstWord.slice(0, -1);
      const femPl = /a$|e$/i.test(stem) || isFemininePlaceName(display);
      return femPl ? `${aLes} ${phrase}` : `${als} ${phrase}`;
    }

    if (startsWithVowelOrH(display)) {
      return `${aL}${phrase}`;
    }

    // singular consonant-start
    // For single-word regions with lowercase=true, use fully lowercased phrase
    // For multi-word regions with lowercase=true, use narrative case (first word capitalized)
    if (isFemininePlaceName(display)) {
      // Single-word feminine regions should be fully lowercased when lowercase=true
      const finalPhrase =
        lowercase && phrase.split(/\s+/).length === 1
          ? phrase.toLowerCase()
          : phrase;
      return `${aLa} ${finalPhrase}`;
    }
    return `${al} ${phrase}`;
  }

  // general
  return `${a} ${text}`;
}

/**
 * Locale-aware place preposition formatting.
 * - ca: uses Catalan "a" + article handling via formatCatalanA
 * - es: "en <place>"
 * - en: "in <place>"
 */
export function formatPlacePreposition(
  name: string,
  type: "region" | "town" | "general" | "" = "general",
  locale: AppLocale = DEFAULT_LOCALE,
  lowercase: boolean = true
): string {
  if (locale === "ca") return formatCatalanA(name, type, lowercase);

  const raw = (name || "").trim();
  const text = lowercase ? raw.toLowerCase() : raw;
  const prep = locale === "es" ? "en" : "in";
  return `${prep} ${text}`;
}

/**
 * Determines if a place name is feminine in Catalan using linguistic patterns.
 * (Heuristic; we special-case a few masculine exceptions.)
 */
function isFemininePlaceName(name: string): boolean {
  const lowerName = (name || "").toLowerCase();

  // Masculine exceptions that often match feminine-looking patterns
  const MASCULINE_EXCEPTIONS = masculineExceptions.map((e) => e.toLowerCase());
  if (MASCULINE_EXCEPTIONS.includes(lowerName)) return false;

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
