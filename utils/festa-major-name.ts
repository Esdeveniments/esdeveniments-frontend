import type { FestaMajorName } from "types/festa-major";
import { FESTA_MAJOR_TERM } from "./constants";
import { normalizeForSearch, slugifySegment } from "./string-helpers";

// Reads the festa's own name from an act title:
//   "Festa major Sant Roc: concert"        → Festa Major de Sant Roc
//   "Correfoc - Festa Major del Gòtic de Barcelona" (in Barcelona) → del Gòtic
//   "Festa Major d'Hivern - Ball"          → Festa Major d'Hivern
//   "Festa Major 2026 - Pregó", "Concert de Festa Major" → the town's own one
// Names are capitalised words; lowercase words ("de maig"), digits, dashes and
// colons end them. Matching is case-sensitive on purpose: with the `i` flag,
// \p{Lu} also matches lowercase letters.

const UNNAMED: FestaMajorName = { key: "", label: null };
const MAX_NAME_WORDS = 4;
const PREPOSITIONS = [
  "de les ",
  "de la ",
  "de l'",
  "dels ",
  "del ",
  "de ",
  "d'",
] as const;
const CONNECTORS = new Set([
  "de",
  "del",
  "dels",
  "la",
  "les",
  "i",
  "el",
  "els",
  "d'en",
  "en",
  "na",
]);
// Words that qualify the town's own festa rather than name another one.
const QUALIFIERS = new Set([
  "jove",
  "infantil",
  "alternativa",
  "gran",
  "popular",
  "musical",
]);
// Act types written after "Festa Major" ("FESTA MAJOR Concert de…"), not a
// festa's name. Compared without accents.
const ACT_WORDS = new Set([
  "concert",
  "prego",
  "ball",
  "sopar",
  "dinar",
  "correfoc",
  "cercavila",
  "exposicio",
  "programa",
  "senior",
  "seniors",
]);
// Adjectives that name a festa without a preposition: "Festa Major Petita".
const ADJECTIVES = new Set(["petita"]);

const WORD = String.raw`(?:[DdLlNn]')?\p{Lu}[\p{Ll}\p{M}·]*(?:-\p{L}[\p{Ll}\p{M}·]*)*(?![\p{L}\p{N}])`;
const NAME_RE = new RegExp(
  String.raw`^${WORD}(?:\s+(?:(?:de|del|dels|la|les|i|el|els|d'en|en|na)\s+)*${WORD})*`,
  "u",
);

const FESTA_MAJOR_RE = new RegExp(
  FESTA_MAJOR_TERM.replace(" ", String.raw`\s+`),
  "i",
);

const normalizeApostrophes = (value: string): string =>
  value.replace(/[’`´]/g, "'");

/** "St. Joan" → "Sant Joan", "Sta. Anna" → "Santa Anna". */
const expandSaints = (value: string): string =>
  value.replace(/\bSt\.\s*/g, "Sant ").replace(/\bSta\.\s*/g, "Santa ");

const normalizeWord = (word: string): string =>
  normalizeForSearch(word).replace(/^[dl]'/, "");

/** "El Masnou" → "masnou", "L'Hospitalet de Llobregat" → "hospitalet de llobregat". */
const townCore = (townLabel: string): string =>
  normalizeForSearch(normalizeApostrophes(townLabel))
    .replace(/^(?:el|la|els|les)\s+|^l'/, "")
    .trim();

const wordsOf = (value: string): string[] => value.split(/\s+/).filter(Boolean);

/** Drops a trailing "de <town>" ("Gòtic de Barcelona" → "Gòtic"). */
function stripTownSuffix(words: string[], town: string[]): string[] {
  if (town.length === 0 || words.length <= town.length) return words;
  const tail = words.slice(-town.length).map(normalizeWord);
  if (tail.join(" ") !== town.join(" ")) return words;
  const rest = words.slice(0, -town.length);
  while (
    rest.length > 0 &&
    CONNECTORS.has(rest[rest.length - 1].toLowerCase())
  ) {
    rest.pop();
  }
  return rest;
}

const startsWithVowelSound = (value: string): boolean =>
  /^[aeiouàèéíòóúh]/i.test(normalizeForSearch(value));

export const isFestaMajorTitle = (title: string): boolean =>
  FESTA_MAJOR_RE.test(title);

export function extractFestaName(
  title: string,
  townLabel: string,
): FestaMajorName {
  const text = expandSaints(normalizeApostrophes(title));
  const found = FESTA_MAJOR_RE.exec(text);
  if (!found) return UNNAMED;
  let rest = text.slice(found.index + found[0].length);
  if (!/^\s/.test(rest)) return UNNAMED;
  rest = rest.trimStart();

  const lower = rest.toLowerCase();
  const preposition = PREPOSITIONS.find((p) => lower.startsWith(p)) ?? null;
  if (preposition) rest = rest.slice(preposition.length);

  const match = NAME_RE.exec(rest);
  if (!match) return UNNAMED;

  const town = wordsOf(townCore(townLabel));
  const words = stripTownSuffix(wordsOf(match[0]), town);
  const significant = words.filter((w) => !CONNECTORS.has(w.toLowerCase()));
  if (significant.length === 0 || significant.length > MAX_NAME_WORDS) {
    return UNNAMED;
  }
  const firstWord = normalizeForSearch(words[0]);
  if (QUALIFIERS.has(firstWord) || ACT_WORDS.has(firstWord)) return UNNAMED;

  const name = words.join(" ");
  const normalizedName = words.map(normalizeWord).join(" ");
  const normalizedTown = town.join(" ");
  // The town's own name, or the start of it ("Sant Quirze" in Sant Quirze del Vallès).
  if (
    normalizedTown === normalizedName ||
    normalizedTown.startsWith(`${normalizedName} `)
  ) {
    return UNNAMED;
  }

  const key = slugifySegment(name);
  if (!key) return UNNAMED;
  const isAdjective = !preposition && ADJECTIVES.has(normalizeForSearch(name));
  const joiner = isAdjective
    ? " "
    : (preposition ?? (startsWithVowelSound(name) ? "d'" : "de "));
  return { key, label: `Festa Major ${joiner}${name}`.replace(/ +/g, " ") };
}

/**
 * Merges keys that only extend a shorter key of the same town and year
 * ("sant-roc-concert" → "sant-roc"), so title-case act names don't split a festa.
 */
export function consolidateKeys(keys: Iterable<string>): Map<string, string> {
  const unique = [...new Set(keys)]
    .filter(Boolean)
    .sort((a, b) => a.length - b.length);
  const canonical = new Map<string, string>();
  for (const key of unique) {
    const base = unique.find((short) => key.startsWith(`${short}-`));
    canonical.set(key, base ? (canonical.get(base) ?? base) : key);
  }
  return canonical;
}
