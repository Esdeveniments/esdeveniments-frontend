import type { EventDetailResponseDTO } from "types/api/event";
import { getFormattedDate, normalizeEndTime } from "@utils/date-helpers";
import type { FaqItem } from "types/faq";
import {
  formatCatalanA,
  capitalizeFirstLetter,
  formatPlaceName,
} from "./string-helpers";
import { formatPlacePreposition } from "@utils/helpers";
import type { EventCopyLabels, StringHelperLabels } from "types/common";
import caMessages from "../messages/ca.json";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";

const defaultEventCopyLabels: EventCopyLabels = (caMessages as any).Utils
  .EventCopy as EventCopyLabels;
const eventCopyStringLabels: StringHelperLabels = (caMessages as any).Utils
  .StringHelpers as StringHelperLabels;
const canonicalArticleMap = Object.values(
  eventCopyStringLabels.articles
).reduce((acc, value) => {
  acc[value.toLowerCase()] = value;
  return acc;
}, {} as Record<string, string>);
const toCanonicalArticle = (token: string) =>
  canonicalArticleMap[token.toLowerCase()] || capitalizeFirstLetter(token);
const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function isValidTime(t: string | null): t is string {
  return !!t && t !== "00:00";
}

function normalize(s: string): string {
  // remove accents and lowercase for robust matching
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Checks if a word matches explicit masculine patterns (not just default masculine).
 * This distinguishes words that are explicitly masculine from those that default to masculine.
 */
function isExplicitlyMasculine(word: string): boolean {
  const raw = (word || "").trim();
  if (!raw) return false;

  const norm = normalize(raw);

  // Greek/loanword masculine endings (many -ma, -ema, -oma are masculine)
  // This covers: problema, sistema, tema, dilema, esquema, cinema, etc.
  // Note: -ama is excluded from the generic pattern to avoid false positives with feminine words
  // However, "programa" and "drama" are masculine exceptions ending in -ama
  // "clima" ends in -ima, not -ma, so it's also an exception
  const masculineAmaExceptions = /^(programa|drama|clima)$/;
  if (masculineAmaExceptions.test(norm)) return true;

  // We match -ema and -oma, and -ma but explicitly exclude -ama
  if (/ema$|oma$/.test(norm)) return true;
  // Match -ma but not -ama (check that it doesn't end in -ama)
  if (/ma$/.test(norm) && !/ama$/.test(norm)) return true;

  // Small unavoidable list of masculine nouns ending in -a that don't match the -ma pattern.
  // These are Greek/loanwords ending in -eta or -ia that can't be generalized because
  // many feminine words also end in -eta (festa, carta, porta) or -ia (farmacia, mania).
  // We can't make a generic pattern for these without catching feminine words.
  const manualMasculineExceptions = /^(dia|poeta|planeta|cometa)$/;
  if (manualMasculineExceptions.test(norm)) return true;

  // Masculine nouns ending in -e that could be confused with feminine plurals
  // e.g., "pare" (parent, masculine) vs "para" (feminine but not the singular of "pares")
  const manualMasculineERegex = /^(pare)$/;
  if (manualMasculineERegex.test(norm)) return true;

  // -or -> usually masculine
  if (/or$/.test(norm)) return true;

  return false;
}

/**
 * Heuristic gender detection:
 * - small set of unavoidable exceptions (handled by regex)
 * - greek/loanword endings (-ma, -ema, -oma...) => masculine
 * - feminine endings (normalized): -a (most), -cio/-sio, -tud, -essa, -ncia, -tza
 * - -or usually masculine
 * default -> masculine
 *
 * This is intentionally compact and readable; it minimizes hard-coded word arrays.
 */
function detectCatalanGender(word: string): "m" | "f" {
  const raw = (word || "").trim();
  if (!raw) return "m";

  const norm = normalize(raw);

  // Ordinal feminine indicator (e.g., 10ª, 3a) -> feminine
  if (/[0-9]+(a|ª)$/i.test(raw)) return "f";
  // Ordinal masculine indicator (e.g., 10º) -> masculine
  if (/[0-9]+º$/i.test(raw)) return "m";

  // Check explicit masculine patterns first
  if (isExplicitlyMasculine(word)) return "m";

  // Feminine endings (normalized)
  // -tat (ciutat, universitat, qualitat) -> feminine (normalized to -tat, but we check before normalization)
  if (/tat$/.test(norm)) return "f";
  if (/(a|cio|sio|tud|essa|ncia|tza)$/.test(norm)) return "f";

  // Small list of unavoidable exceptions that don't follow patterns
  // These are common feminine nouns that don't end in typical feminine endings
  const manualFeminineExceptions = /^(nit|llum|veu|mar)$/;
  if (manualFeminineExceptions.test(norm)) return "f";

  // fallback to masculine
  return "m";
}

function detectCatalanGenderAndNumber(word: string): {
  gender: "m" | "f";
  number: "sg" | "pl";
} {
  const raw = (word || "").trim();
  if (!raw) return { gender: "m", number: "sg" };

  const norm = normalize(raw);

  // Handle Roman numerals (I, II, III, IV, V, etc.) - they don't affect gender/number
  // but we should skip them for article detection
  if (/^[ivxlcdm]+$/i.test(norm)) {
    // Roman numeral - return default, will be handled specially in article detection
    return { gender: "m", number: "sg" };
  }

  // quick plural detection: ends with s (es or s)
  // Skip plural detection for singular words ending in accented -s (e.g., "congrés", "parís")
  // These are singular nouns, not plurals, so they should be handled as singular
  const hasAccentedSingularS = /[àèéíïòóú]s$/i.test(raw);
  if (!hasAccentedSingularS && norm.length > 1 && /s$/.test(norm)) {
    let singular = norm.endsWith("es") ? norm.slice(0, -2) : norm.slice(0, -1);

    // For words ending in "es", check if adding "a" makes it feminine
    // This handles cases like "festes" (plural of "festa") where removing "es" gives "fest"
    // but the actual singular is "festa" (feminine)
    // Only add "a" if the stem alone is not already clearly feminine
    if (norm.endsWith("es") && singular.length > 0) {
      const stemGender = detectCatalanGender(singular);
      // If stem is not clearly feminine, try adding "a"
      if (stemGender !== "f") {
        // Before adding "a", check if adding "e" would make it explicitly masculine
        // This prevents cases like "pares" (from "pare", masculine) being incorrectly
        // feminized to "para" (which is feminine but not the correct singular)
        const singularWithE = singular + "e";

        // If stem + "e" is explicitly masculine (matches explicit patterns), don't add "a"
        // This handles "pare" (masculine, explicit) vs "festa" (feminine)
        // "feste" would be default masculine (not explicit), so we still try adding "a"
        if (isExplicitlyMasculine(singularWithE)) {
          // Stem + "e" is explicitly masculine, so the word is likely masculine
          // Don't add "a" - keep the masculine stem
          singular = singularWithE;
        } else {
          // Try adding "a" to see if it makes it feminine
          const singularWithA = singular + "a";
          // If adding "a" makes it detect as feminine, use that
          if (detectCatalanGender(singularWithA) === "f") {
            singular = singularWithA;
          }
        }
      }
    }

    const gender = detectCatalanGender(singular);
    return { gender, number: "pl" };
  }

  return { gender: detectCatalanGender(norm), number: "sg" };
}

/** Return the correct article token (capitalized) for a *word* (not whole title) */
function getCatalanArticleForWord(word: string): string {
  // Handle Roman numerals specially - they should use "La" for feminine contexts
  const { articles } = eventCopyStringLabels;
  const norm = (word || "").trim().toLowerCase();
  if (/^[ivxlcdm]+$/.test(norm)) {
    // Roman numeral - default to "La" (most common for "Fira", "Edició", etc.)
    return articles.la;
  }

  const { gender, number } = detectCatalanGenderAndNumber(word);
  const startsWithVowelOrH = /^[aeiouàáèéíïòóúüh]/i.test(word);

  if (number === "pl") return gender === "f" ? articles.les : articles.els;
  if (startsWithVowelOrH) return articles.l;
  return gender === "f" ? articles.la : articles.el;
}

/** If title already begins with an article, extract it and the rest. */
function extractLeadingArticle(title: string): {
  articleToken: string | null;
  rest: string;
} {
  const articleTokens = Object.values(eventCopyStringLabels.articles);
  const regex = new RegExp(
    `^(${articleTokens
      .map((token) => escapeRegex(token.toLowerCase()))
      .join("|")})\\b\\s*`,
    "i"
  );
  const m = title.match(regex);
  if (!m) return { articleToken: null, rest: title };
  return { articleToken: m[1].toLowerCase(), rest: title.slice(m[0].length) };
}

/**
 * Capitalize places:
 * - first word after prepositions (al, a, del, de la, ...): capitalize first letter of the place
 * - inside parentheses: title-case every word (e.g. "(vallès oriental)" -> "(Vallès Oriental)")
 */
function capitalizePlaces(text: string): string {
  const prepsPattern = eventCopyStringLabels.capitalizePrepositions
    .map((p) => escapeRegex(p))
    .join("|");
  // 1) capitalize first word after common prepositions
  text = text.replace(
    new RegExp(
      `\\b(${prepsPattern})\\s+([a-zà-ÿ][\\w'’-]*(?:\\s+[a-zà-ÿ][\\w'’-]*)*)(?=[,.;)]|$)`,
      "gi"
    ),
    (_match, prep, place) => {
      const trimmedPlace = place.trim();
      const seIndex = trimmedPlace.toLowerCase().indexOf(" se ");
      const placePortion =
        seIndex >= 0 ? trimmedPlace.slice(0, seIndex).trim() : trimmedPlace;
      const remainder = seIndex >= 0 ? trimmedPlace.slice(seIndex) : "";
      const articleMatch = placePortion.match(
        /^(l['’]|el|la|els|les)\s+(.*)$/i
      );
      if (articleMatch) {
        const article = articleMatch[1].toLowerCase();
        const rest = articleMatch[2];
        const formattedRest = formatPlaceName(rest);
        const spacer = article.endsWith("'") ? "" : " ";
        return `${prep} ${article}${spacer}${formattedRest}${remainder}`;
      }

      return `${prep} ${formatPlaceName(placePortion)}${remainder}`;
    }
  );

  // 2) Title-case inside parentheses
  // Match any content until a closing ')' (allow backslashes inside)
  text = text.replace(/\(([^)]+)\)/g, (_m, inside) => {
    const words = inside
      .split(/\s+/)
      .map((w: string) => (w.length ? capitalizeFirstLetter(w) : w));
    return `(${words.join(" ")})`;
  });

  return text;
}

export async function buildEventIntroText(
  event: EventDetailResponseDTO,
  labels: EventCopyLabels = defaultEventCopyLabels,
  locale: AppLocale = DEFAULT_LOCALE
): Promise<string> {
  const cityName = formatPlaceName(event.city?.name || "");
  const regionName = formatPlaceName(event.region?.name || "");
  const formattedLocation = formatPlaceName(event.location || "");

  const { formattedStart, formattedEnd, nameDay } = await getFormattedDate(
    event.startDate,
    event.endDate,
    locale
  );

  const placeSummary = cityName
    ? `${cityName}${regionName ? ` (${regionName})` : ""}`
    : regionName || formattedLocation || "";

  // Determine location type: prioritize city over region
  // If event has a city, it's a "town" even if it also has a region (e.g., "Tona (Osona)")
  const locationType = event.city
    ? "town"
    : event.region
    ? "region"
    : "general";
  const preposition = formatPlacePreposition(
    placeSummary,
    locationType,
    locale,
    false
  );

  // Title and article handling
  const rawTitle = (event.title || "").trim();
  const titleLower = rawTitle.toLowerCase();

  // If the user already stored a leading article inside title, respect it
  const { articleToken, rest } = extractLeadingArticle(titleLower);

  let displayedTitle: string;
  let isPlural = false;

  if (articleToken) {
    // Validate and correct the article if needed
    // Get the first word after the article to check gender/number
    let firstWordAfterArticle = (rest.split(/\s+/)[0] || "").replace(/^l'/, "");

    // Check if first word is a Roman numeral
    const isFirstWordRomanNumeral = /^[ivxlcdm]+$/i.test(firstWordAfterArticle);
    if (isFirstWordRomanNumeral && rest.split(/\s+/).length > 1) {
      // If it's a Roman numeral, look at the next word for article detection
      firstWordAfterArticle = rest.split(/\s+/)[1] || "";
    }

    const correctArticle = getCatalanArticleForWord(firstWordAfterArticle);

    // If correct article is L' and we have a Roman numeral, convert to La/El
    let finalCorrectArticle = correctArticle;
    if (
      correctArticle === eventCopyStringLabels.articles.l &&
      isFirstWordRomanNumeral
    ) {
      const { gender } = detectCatalanGenderAndNumber(firstWordAfterArticle);
      finalCorrectArticle =
        gender === "f"
          ? eventCopyStringLabels.articles.la
          : eventCopyStringLabels.articles.el;
    }

    // Check if the provided article matches the correct one
    // Special case: if we have "L'" before a Roman numeral, use the article for the word after the numeral
    const shouldUseArticleForRomanNumeral =
      articleToken === eventCopyStringLabels.articles.l.toLowerCase() &&
      isFirstWordRomanNumeral;

    // Don't include shouldUseArticleForRomanNumeral in articleMatches - we want to correct it
    const articleMatches =
      articleToken.toLowerCase() === finalCorrectArticle.toLowerCase() ||
      (articleToken === eventCopyStringLabels.articles.l.toLowerCase() &&
        correctArticle === eventCopyStringLabels.articles.l &&
        !isFirstWordRomanNumeral);

    // Use the correct article if there's a mismatch
    let finalArticle: string;
    if (shouldUseArticleForRomanNumeral) {
      // Special case: correct "L'" to the appropriate article before Roman numeral
      finalArticle = finalCorrectArticle;
    } else if (articleMatches) {
      // Article is correct, keep it (capitalized)
      finalArticle = toCanonicalArticle(articleToken);
    } else {
      // Article is wrong, use the correct one
      finalArticle = finalCorrectArticle;
    }

    // Handle capitalization: if first word is Roman numeral, capitalize it and next word
    const restWords = rest.trim().split(/\s+/);
    let capitalizedTitle: string;

    if (isFirstWordRomanNumeral && restWords.length > 1) {
      const romanNumeral = restWords[0].toUpperCase();
      // Keep the word after Roman numeral lowercase
      const nextWord = restWords[1] || "";
      const remainingWords =
        restWords.length > 2 ? " " + restWords.slice(2).join(" ") : "";
      capitalizedTitle = `${romanNumeral} ${nextWord}${remainingWords}`;
    } else {
      // Keep the first word after the article lowercase
      const firstRestWord = restWords[0] || "";
      const remainingWords =
        restWords.length > 1 ? " " + restWords.slice(1).join(" ") : "";
      capitalizedTitle = firstRestWord + remainingWords;
    }

    displayedTitle =
      finalArticle + (finalArticle.endsWith("'") ? "" : " ") + capitalizedTitle;
    isPlural = [
      eventCopyStringLabels.articles.els,
      eventCopyStringLabels.articles.les,
    ].some((token) => token.toLowerCase() === finalArticle.toLowerCase());
  } else {
    // Derive article from first word
    // Skip Roman numerals and get the actual noun
    const words = titleLower.split(/\s+/);
    let firstWord = (words[0] || "").replace(/^l'/, "");

    // If first word is a Roman numeral, look at the next word
    if (/^[ivxlcdm]+$/i.test(firstWord) && words.length > 1) {
      firstWord = words[1].replace(/^l'/, "");
    }

    const article = getCatalanArticleForWord(firstWord);
    isPlural = [
      eventCopyStringLabels.articles.els,
      eventCopyStringLabels.articles.les,
    ].some((token) => token.toLowerCase() === article.toLowerCase());

    // For Roman numerals at the start, determine article from the following word
    const hasLeadingRomanNumeral =
      words.length > 0 && /^[ivxlcdm]+$/i.test(words[0]);
    if (hasLeadingRomanNumeral) {
      const romanNumeral = words[0].toUpperCase();
      // Determine article based on the word after the Roman numeral
      const nextWord = words.length > 1 ? words[1] : "";
      let article = eventCopyStringLabels.articles.la; // default
      if (nextWord) {
        const articleFromWord = getCatalanArticleForWord(nextWord);
        // If we get "L'", convert to "La" or "El" based on gender
        if (articleFromWord === eventCopyStringLabels.articles.l) {
          const { gender } = detectCatalanGenderAndNumber(nextWord);
          article =
            gender === "f"
              ? eventCopyStringLabels.articles.la
              : eventCopyStringLabels.articles.el;
        } else {
          article = articleFromWord;
        }
      }
      // Recompute isPlural after finalizing the article
      isPlural = /^(els|les)$/i.test(article);
      // Keep the word after Roman numeral lowercase
      const restOfTitle =
        words.length > 2 ? " " + words.slice(2).join(" ") : "";
      displayedTitle = `${article} ${romanNumeral} ${nextWord}${restOfTitle}`;
    } else {
      // attach article to title (L' + title vs El + ' ' + title)
      // Keep first word of title lowercase
      const firstWord = titleLower.split(/\s+/)[0] || "";
      const restOfTitleLower = titleLower.split(/\s+/).slice(1).join(" ");
      displayedTitle = article.endsWith("'")
        ? `${article}${firstWord}${
            restOfTitleLower ? " " + restOfTitleLower : ""
          }`
        : `${article} ${firstWord}${
            restOfTitleLower ? " " + restOfTitleLower : ""
          }`;
    }
  }

  const normalizedEndTime = normalizeEndTime(event.startTime, event.endTime);
  const startTimeLabel = isValidTime(event.startTime) ? event.startTime : "";
  const endTimeLabel = isValidTime(normalizedEndTime) ? normalizedEndTime : "";

  const timePart = startTimeLabel
    ? `${startTimeLabel}${endTimeLabel ? `–${endTimeLabel}` : ""}`
    : "";

  // Verb agreement: plural/singular
  // In Catalan, "se celebra" is correct (preferred over "es celebra" or "s'celebra")
  // Before verbs starting with voiceless "s" sound (s-, ce-, ci-), "se" is preferred
  const sentenceLabels = labels.sentence;
  const verb = isPlural
    ? sentenceLabels.verbPlural
    : sentenceLabels.verbSingular;

  let datePart: string;
  if (formattedEnd) {
    datePart = sentenceLabels.dateRange
      .replace("{start}", formattedStart)
      .replace("{end}", formattedEnd);
  } else {
    datePart = sentenceLabels.dateSingle
      .replace("{nameDay}", nameDay.toLowerCase())
      .replace("{start}", formattedStart);
  }

  // Compose sentence
  const timeSuffix = timePart
    ? sentenceLabels.timeSuffix.replace("{time}", timePart)
    : "";
  const placeSuffix = preposition
    ? sentenceLabels.placeSuffix.replace("{place}", preposition)
    : "";
  const sentence = sentenceLabels.sentence
    .replace("{title}", displayedTitle)
    .replace("{verb}", verb)
    .replace("{date}", datePart)
    .replace("{time}", timeSuffix)
    .replace("{place}", placeSuffix);

  // Capitalize place names after prepositions and in parentheses
  return capitalizePlaces(sentence);
}

export async function buildFaqItems(
  event: EventDetailResponseDTO,
  labels: EventCopyLabels = defaultEventCopyLabels,
  locale: AppLocale = DEFAULT_LOCALE
): Promise<FaqItem[]> {
  const items: FaqItem[] = [];

  const cityName = formatPlaceName(event.city?.name || "");
  const regionName = formatPlaceName(event.region?.name || "");
  const formattedLocation = formatPlaceName(event.location || "");

  const { formattedStart, formattedEnd, nameDay } = await getFormattedDate(
    event.startDate,
    event.endDate,
    locale
  );
  const formattedEventDate = formattedEnd
    ? labels.sentence.dateRange
        .replace("{start}", formattedStart)
        .replace("{end}", formattedEnd)
    : labels.sentence.dateSingle
        .replace("{nameDay}", nameDay.toLowerCase())
        .replace("{start}", formattedStart);

  const normalizedEndTime = normalizeEndTime(event.startTime, event.endTime);
  const startTimeLabel = isValidTime(event.startTime) ? event.startTime : "";
  const endTimeLabel = isValidTime(normalizedEndTime) ? normalizedEndTime : "";
  const hasDistinctEndTime = Boolean(startTimeLabel) && Boolean(endTimeLabel);
  const timeLabel = startTimeLabel
    ? `${startTimeLabel}${hasDistinctEndTime ? ` - ${endTimeLabel}` : ""}`
    : "";

  // Capitalize first letter since the date starts the answer sentence
  const capitalizedDate = capitalizeFirstLetter(formattedEventDate);
  const whenAnswer = labels.faq.whenA
    .replace("{date}", capitalizedDate)
    .replace(
      "{time}",
      timeLabel ? labels.sentence.timeSuffix.replace("{time}", timeLabel) : ""
    );
  items.push({
    q: labels.faq.whenQ,
    a: whenAnswer,
  });

  // Build clean location string: split location by commas, drop tokens equal to city/region, de-duplicate
  const partsFromLocation = formattedLocation
    ? formattedLocation
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];
  const normalizedCityName = cityName ? normalize(cityName) : "";
  const normalizedRegionName = regionName ? normalize(regionName) : "";
  const finalWhereParts: string[] = [];
  const seenWhere = new Set<string>();

  const addPart = (v?: string) => {
    if (!v) return;
    const key = normalize(v);
    if (!key || seenWhere.has(key)) return;
    seenWhere.add(key);
    finalWhereParts.push(v.trim());
  };

  for (const p of partsFromLocation) {
    const key = normalize(p);
    if (key === normalizedCityName || key === normalizedRegionName) continue;
    addPart(p);
  }
  addPart(cityName);
  addPart(regionName);

  if (finalWhereParts.length > 0) {
    // Capitalize first word of each place (city / region) for the FAQ too
    const places = finalWhereParts.map((p) => {
      const trimmed = p.trim();
      return formatPlaceName(trimmed);
    });
    items.push({
      q: labels.faq.whereQ,
      a: labels.faq.whereA.replace("{place}", places.join(", ")),
    });
  }

  // NOTE: "Is it free?" FAQ removed intentionally.
  // We don't have reliable pricing data (event.type defaults to "FREE"),
  // so showing this FAQ could mislead users. See implementation_plan.md.

  if (event.duration && event.duration.trim().length > 0) {
    items.push({
      q: labels.faq.durationQ,
      a: labels.faq.durationA.replace("{duration}", event.duration),
    });
  }

  // "More Info" FAQ: only show if event has an external URL.
  // This provides SEO value by answering "where can I find more info?" queries
  // while directing users to the official source.
  if (event.url && event.url.trim().length > 0) {
    items.push({
      q: labels.faq.moreInfoQ,
      a: labels.faq.moreInfoA,
    });
  }

  return items;
}

export function buildFaqJsonLd(items: FaqItem[]) {
  if (!items || items.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  } as const;
}
