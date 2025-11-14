/* =========================================================
 * String helpers (Catalan-aware)
 * ======================================================= */

/** Lowercases, strips diacritics, handles Catalan l·l and apostrophes, collapses to ascii-friendly slugs. */
export function sanitize(input: string): string {
  if (!input) return "";
  const s = input
    .trim()
    .toLowerCase()
    .normalize("NFKD") // split accents
    .replace(/\p{M}+/gu, "") // remove all combining marks (faster than hand-picked ranges)
    .replace(/·/g, "") // l·l -> ll
    .replace(/['’]+/g, " ") // treat apostrophes as separators (l'escala -> l escala)
    .replace(/[–—―]/g, "-") // en/em dashes -> hyphen
    .replace(/&/g, " i ") // & -> i (Catalan)
    .replace(/[^a-z0-9\s-]/g, "") // drop the rest
    .replace(/[\s_-]+/g, "-") // collapse separators
    .replace(/^-+|-+$/g, ""); // trim hyphens
  return s || "n-a";
}

/**
 * Legacy sanitize variant used only for matching incoming slugs from older content.
 * Differs from sanitize() by removing apostrophes instead of spacing/hyphenating them.
 * Example: "L'Escala" -> "lescala" (legacy) vs "l-escala" (current).
 */
export function sanitizeLegacyApostrophe(input: string): string {
  if (!input) return "";
  const s = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/·/g, "")
    .replace(/['’]+/g, "") // legacy: drop apostrophes
    .replace(/[–—―]/g, "-")
    .replace(/&/g, " i ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "n-a";
}

export const slug = (
  title: string,
  formattedStart: string,
  id: string
): string =>
  [sanitize(title), sanitize(formattedStart), id?.trim()]
    .filter(Boolean)
    .join("-");

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

  // Add https:// protocol if missing
  return `https://${trimmed}`;
}

/* =========================================================
 * Catalan grammar helpers
 * ======================================================= */

const VOWEL_OR_H = /^[aeiouàáèéíïòóúüh]/i;

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

const FEMININE_EXCEPTIONS = ["gent gran", "dansa"];

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

  // ---- towns: keep simple (your tests expect only "de"/"d'")
  if (type === "town") {
    return startsWithVowelOrH(text) ? `d'${text}` : `de ${text}`;
  }

  // ---- regions: plural detection + gender heuristic (no external table required)
  if (type === "region") {
    if (!includeArticle) {
      return startsWithVowelOrH(text) ? `d'${text}` : `de ${text}`;
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
      return isFemPl ? `de les ${text}` : `dels ${text}`;
    }

    if (startsWithVowelOrH(firstWord)) return `de l'${text}`;
    return isFemininePlaceName(text) ? `de la ${text}` : `del ${text}`;
  }

  // ---- categories / general nouns
  if (!includeArticle) {
    return startsWithVowelOrH(text) ? `d'${text}` : `de ${text}`;
  }

  const firstWord = text.split(/\s+/)[0];
  const { plural, feminine } = classifyCategory(firstWord, text);

  if (startsWithVowelOrH(firstWord)) {
    if (plural) return feminine ? `de les ${text}` : `dels ${text}`;
    return `de l'${text}`;
  }

  if (plural) return feminine ? `de les ${text}` : `dels ${text}`;
  return feminine ? `de la ${text}` : `del ${text}`;
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

  if (normalizedType === "town") {
    return `a ${text}`;
  }

  if (normalizedType === "region") {
    // Handle empty string early
    if (!raw) {
      return "a ";
    }

    // Special-case proper name that does not take an article in Catalan
    // e.g., "Catalunya" → "a Catalunya" (never "a la Catalunya")
    if ((raw || "").trim().toLowerCase() === "catalunya") {
      return lowercase ? "a catalunya" : "a Catalunya";
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
      return femPl ? `a les ${phrase}` : `als ${phrase}`;
    }

    if (startsWithVowelOrH(display)) {
      return `a l'${phrase}`;
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
      return `a La ${finalPhrase}`;
    }
    return `al ${phrase}`;
  }

  // general
  return `a ${text}`;
}

/**
 * Determines if a place name is feminine in Catalan using linguistic patterns.
 * (Heuristic; we special-case a few masculine exceptions.)
 */
function isFemininePlaceName(name: string): boolean {
  const lowerName = (name || "").toLowerCase();

  // Masculine exceptions that often match feminine-looking patterns
  const MASCULINE_EXCEPTIONS = [
    "penedès",
    "alt penedès",
    "baix penedès",
    "rosselló",
    "urgell",
    "alt urgell",
    "pla d'urgell",
    "vallès",
    "vallès oriental",
    "vallès occidental",
    "gironès",
    "barcelonès",
    "tarragonès",
    "montsià",
    "baix ebre",
    "maresme",
    "bages",
  ];
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
