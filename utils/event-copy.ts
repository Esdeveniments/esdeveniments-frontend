import type { EventDetailResponseDTO } from "types/api/event";
import { getFormattedDate } from "@utils/date-helpers";
import type { FaqItem } from "types/faq";
import { formatCatalanA, capitalizeFirstLetter } from "./string-helpers";

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

  // Small unavoidable list of masculine nouns that end in -a (Greek/loanword or irregular).
  // Kept minimal. If you see common false positives, add them here (rare).
  const manualMasculineRegex =
    /^(dia|poeta|planeta|cometa|problema|sistema|tema|dilema|esquema)$/;
  if (manualMasculineRegex.test(norm)) return "m";

  // Greek/loanword masculine endings (many -ma, -ema, -oma are masculine)
  if (/(ma|ema|oma|ama)$/.test(norm)) return "m";

  // Feminine endings (normalized)
  if (/(a|cio|sio|tud|essa|ncia|tza)$/.test(norm)) return "f";

  // -or -> usually masculine
  if (/or$/.test(norm)) return "m";

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

  // quick plural detection: ends with s (es or s)
  if (norm.length > 1 && /s$/.test(norm)) {
    const singular = norm.endsWith("es")
      ? norm.slice(0, -2)
      : norm.slice(0, -1);
    const gender = detectCatalanGender(singular);
    return { gender, number: "pl" };
  }

  return { gender: detectCatalanGender(norm), number: "sg" };
}

/** Return the correct article token (capitalized) for a *word* (not whole title) */
function getCatalanArticleForWord(
  word: string
): "El" | "La" | "L'" | "Els" | "Les" {
  const { gender, number } = detectCatalanGenderAndNumber(word);
  const startsWithVowelOrH = /^[aeiouàáèéíïòóúüh]/i.test(word);

  if (number === "pl") return gender === "f" ? "Les" : "Els";
  if (startsWithVowelOrH) return "L'";
  return gender === "f" ? "La" : "El";
}

/** If title already begins with an article, extract it and the rest. */
function extractLeadingArticle(title: string): {
  articleToken: string | null;
  rest: string;
} {
  const m = title.match(/^(l'|els|les|el|la)\b\s*/i);
  if (!m) return { articleToken: null, rest: title };
  return { articleToken: m[1].toLowerCase(), rest: title.slice(m[0].length) };
}

/**
 * Capitalize places:
 * - first word after prepositions (al, a, del, de la, ...): capitalize first letter of the place
 * - inside parentheses: title-case every word (e.g. "(vallès oriental)" -> "(Vallès Oriental)")
 */
function capitalizePlaces(text: string): string {
  // 1) capitalize first word after common prepositions
  text = text.replace(
    /\b(al|a|del|dels|de la|de les|de l’|de l'|pel|pels)\s+([a-zà-ÿ][\w'’\-\s]*)/gi,
    (_match, prep, place) => {
      return `${prep} ${capitalizeFirstLetter(place)}`;
    }
  );

  // 2) Title-case inside parentheses
  text = text.replace(/\(([^\\)]+)\)/g, (_m, inside) => {
    const words = inside
      .split(/\s+/)
      .map((w: string) => (w.length ? capitalizeFirstLetter(w) : w));
    return `(${words.join(" ")})`;
  });

  return text;
}

export function buildEventIntroText(event: EventDetailResponseDTO): string {
  const cityName = event.city?.name || "";
  const regionName = event.region?.name || "";

  const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
    event.startDate,
    event.endDate
  );

  const startTimeLabel = isValidTime(event.startTime) ? event.startTime : "";
  const endTimeLabel = isValidTime(event.endTime) ? event.endTime : "";

  const placeSummary = cityName
    ? `${cityName}${regionName ? ` (${regionName})` : ""}`
    : regionName || event.location || "";

  // Determine location type: prioritize city over region
  // If event has a city, it's a "town" even if it also has a region (e.g., "Tona (Osona)")
  const locationType = event.city
    ? "town"
    : event.region
    ? "region"
    : "general";
  // formatCatalanA will handle "a", "al", "a la", etc.; we'll capitalize names afterwards
  const preposition = formatCatalanA(placeSummary, locationType);

  // Title and article handling
  const rawTitle = (event.title || "").trim();
  const titleLower = rawTitle.toLowerCase();

  // If the user already stored a leading article inside title, respect it
  const { articleToken, rest } = extractLeadingArticle(titleLower);

  let displayedTitle: string;
  let isPlural = false;

  if (articleToken) {
    // Rebuild title but with capitalized article
    const articleCap =
      articleToken === "l'" ? "L'" : capitalizeFirstLetter(articleToken);
    displayedTitle =
      articleCap + (articleCap.endsWith("'") ? "" : " ") + rest.trim();
    isPlural = /^(els|les)$/i.test(articleToken);
  } else {
    // Derive article from first word
    const firstWord = (titleLower.split(/\s+/)[0] || "").replace(/^l'/, "");
    const article = getCatalanArticleForWord(firstWord);
    isPlural = /^(Els|Les)$/i.test(article);
    // attach article to title (L' + title vs El + ' ' + title)
    displayedTitle = article.endsWith("'")
      ? `${article}${titleLower}`
      : `${article} ${titleLower}`;
  }

  const timePart = startTimeLabel
    ? `${startTimeLabel}${endTimeLabel ? `–${endTimeLabel}` : ""}`
    : "";

  // Verb agreement: plural/singular
  const verb = isPlural ? "se celebren" : "se celebra";

  let datePart: string;
  if (formattedEnd) {
    datePart = `del ${formattedStart} al ${formattedEnd}`;
  } else {
    datePart = `el ${nameDay.toLowerCase()}, ${formattedStart}`;
  }

  // Compose sentence
  const sentence = `${displayedTitle} ${verb} ${datePart}${
    timePart ? `, ${timePart}` : ""
  }, ${preposition}.`;

  // Capitalize place names after prepositions and in parentheses
  return capitalizePlaces(sentence);
}

export function buildFaqItems(event: EventDetailResponseDTO): FaqItem[] {
  const items: FaqItem[] = [];

  const cityName = event.city?.name || "";
  const regionName = event.region?.name || "";

  const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
    event.startDate,
    event.endDate
  );
  const formattedEventDate = formattedEnd
    ? `del ${formattedStart} al ${formattedEnd}`
    : `${nameDay}, ${formattedStart}`;

  const startTimeLabel = isValidTime(event.startTime) ? event.startTime : "";
  const endTimeLabel = isValidTime(event.endTime) ? event.endTime : "";
  const timeLabel = startTimeLabel
    ? `${startTimeLabel}${endTimeLabel ? ` - ${endTimeLabel}` : ""}`
    : "";

  items.push({
    q: "Quan és l'esdeveniment?",
    a: `${formattedEventDate}${timeLabel ? `, ${timeLabel}` : ""}`,
  });

  // Build clean location string: split location by commas, drop tokens equal to city/region, de-duplicate
  const partsFromLocation = event.location
    ? event.location
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];
  const cityKey = cityName ? normalize(cityName) : "";
  const regionKey = regionName ? normalize(regionName) : "";
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
    if (key === cityKey || key === regionKey) continue;
    addPart(p);
  }
  addPart(cityName);
  addPart(regionName);

  if (finalWhereParts.length > 0) {
    // Capitalize first word of each place (city / region) for the FAQ too
    const places = finalWhereParts.map((p) => {
      const trimmed = p.trim();
      return capitalizeFirstLetter(trimmed);
    });
    items.push({ q: "On se celebra?", a: places.join(", ") });
  }

  items.push({
    q: "És gratuït?",
    a:
      event.type === "FREE"
        ? "Sí, l’esdeveniment és gratuït."
        : "No, l’esdeveniment és de pagament.",
  });

  if (event.duration && event.duration.trim().length > 0) {
    items.push({ q: "Quina és la durada aproximada?", a: event.duration });
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
