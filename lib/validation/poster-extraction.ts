import { z } from "zod";
import { TIMEZONE_MADRID } from "@utils/constants";
import { addDaysYmd, splitLocalDateTime } from "@utils/date-helpers";
import {
  getEventPriceText,
  isFreePriceText,
  parseSchemaPrice,
} from "@utils/event-price";
import { isValidEventUrl, normalizeUrl } from "@utils/event-url";
import { stripHtmlTags } from "@utils/sanitize";
import {
  dropPlaceParts,
  normalizeForSearch,
  truncateAtWord,
} from "@utils/string-helpers";
import type { CategorySummaryResponseDTO } from "types/api/category";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";
import type {
  PosterExtractedEvent,
  PosterPriceResolution,
} from "types/api/poster";

const MAX_TITLE_CHARS = 140;
const MAX_DESCRIPTION_CHARS = 3000;
const MAX_TOWN_CHARS = 80;
const MAX_LOCATION_CHARS = 160;
const MAX_PRICE_CHARS = 120;
const MAX_CATEGORIES = 3;

const MISSING_SENTINELS = new Set([
  "null",
  "none",
  "n/a",
  "na",
  "desconegut",
  "desconocido",
  "unknown",
  "sense especificar",
  "sin especificar",
  "-",
]);

// Donation-based entry phrases: NEVER treat as "free" ("0").
const DONATION_PRICE_RE =
  /\b(taquilla\s+inversa|aportacio\s+voluntaria|aportacion\s+voluntaria|donatiu|donativo|la\s+voluntat|la\s+voluntad|paga\s+el\s+que\s+vulguis|pay\s+what\s+you\s+can|prix\s+libre|participation\s+libre|offerta\s+libera|spendenbasis|donation\s+based|suggested\s+donation)\b/i;

// Any euro amount appearing inside a price string ("8,50 €", "€ 10", "5 euros").
const EURO_AMOUNT_GLOBAL_RE =
  /(?:€\s*(\d{1,4}(?:[.,]\d{1,2})?)|(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:€|euros?|eur\b))/gi;

const FREE_MENTION_RE =
  /\b(gratuit\w*|gratis|entrada\s+lliure|entrada\s+libre|entrada\s+gratuita|entrada\s+livre|acces\s+lliure|acceso\s+libre|entree\s+(?:gratuite|libre)|ingresso\s+(?:gratuito|libero)|eintritt\s+frei|kostenlos|sarrera\s+doan|free\s+(?:entry|admission)?)\b/i;

// Subset qualifiers where "free" applies only to a restricted group (kids,
// members, seniors, etc.) rather than general admission.
const RESTRICTED_FREE_RE =
  /\b(socis|socios|members?|infants?|nens?|ninos?|menors?|menores|kids?|children|jubilats?|estudiants?|estudiantes?|students?|fins\s+a\s+\d+|hasta\s+\d+|under\s+\d+|menys\s+de\s+\d+|moins\s+de\s+\d+)\b/i;

/**
 * Strict JSON Schema forwarded to ai-gateway (`response_format.json_schema`).
 * Gemini enforces this natively; fallback providers embed it in the system prompt.
 */
export const POSTER_EXTRACTION_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    title: {
      type: ["string", "null"],
      description:
        "Clear, specific event title in the output language requested by the prompt (max 90 chars). Null if unreadable or not an event poster.",
    },
    description: {
      type: ["string", "null"],
      description:
        "Factual, natural description in the output language requested by the prompt (1 to 3 concise paragraphs separated by \\n\\n) capturing only details visible on the poster. Lead with what the event is (do not waste the first sentence repeating date/town boilerplate). Plain text or sparing **bold** only; never Markdown # headings or HTML. Never invent details or clichés. Null if not an event poster.",
    },
    startDate: {
      type: ["string", "null"],
      description:
        "Event start in Europe/Madrid local time: YYYY-MM-DDTHH:mm when a start time is shown, or YYYY-MM-DD when only a date is shown. Null if unclear.",
    },
    endDate: {
      type: ["string", "null"],
      description:
        "Event end in Europe/Madrid local time: YYYY-MM-DDTHH:mm or YYYY-MM-DD. Null if no end time or end date is printed on the poster.",
    },
    isAllDay: {
      type: "boolean",
      description:
        "True only when the poster gives date(s) without specific start/end times; false when a start time is visible or when no date is found.",
    },
    hasExplicitYear: {
      type: "boolean",
      description:
        "True if a 4-digit year is visibly printed on the poster; false if the year had to be inferred or no date was found.",
    },
    isMultiEvent: {
      type: "boolean",
      description:
        "True if the poster is a multi-event programme or festival listing several distinct acts/sessions; false for a single event.",
    },
    town: {
      type: ["string", "null"],
      description:
        "Municipality name explicitly printed on the poster (official Catalan spelling when in Catalonia, e.g. 'Cardedeu', 'Mataró', 'Barcelona', 'Girona'). Do not include comarca, province, or venue name. Null if no town is visibly printed — never guess from venue or logo.",
    },
    location: {
      type: ["string", "null"],
      description:
        "Specific venue, theatre, square, or street address without repeating the town name (e.g. 'Teatre Auditori', 'Plaça Major'). Null if not visible.",
    },
    url: {
      type: ["string", "null"],
      description:
        "Event website or ticket URL explicitly printed on the poster. Never invent or guess a URL. Null if none is printed.",
    },
    price: {
      type: ["string", "null"],
      description:
        "Exact price text visible on the poster: e.g. 'Entrada lliure', 'Gratuït', '12 €', 'Anticipada 8,50 € / Taquilla 10 €', 'Taquilla inversa'. Null if no price is mentioned.",
    },
    categories: {
      type: "array",
      items: { type: "string" },
      description:
        "Up to 3 matching category slugs chosen strictly from the allowed list in the prompt. Empty array if unsure or not an event poster.",
    },
  },
  required: [
    "title",
    "description",
    "startDate",
    "endDate",
    "isAllDay",
    "hasExplicitYear",
    "isMultiEvent",
    "town",
    "location",
    "url",
    "price",
    "categories",
  ],
  additionalProperties: false,
};

function getMadridDateAnchor(now: Date): { ymd: string; weekday: string; year: number } {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_MADRID,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const weekday = new Intl.DateTimeFormat("ca-ES", {
    timeZone: TIMEZONE_MADRID,
    weekday: "long",
  }).format(now);
  return { ymd, weekday, year: Number(ymd.slice(0, 4)) };
}

const OUTPUT_LANGUAGE_GUIDANCE: Record<AppLocale, string> = {
  ca: "Write title and description in crisp, natural, idiomatic Catalan. If the poster is bilingual and already includes Catalan text, use the Catalan version; otherwise translate Spanish, English, or any other poster language accurately into natural Catalan without castellanismes or anglocismes. Keep proper nouns, artist/band names, venue names, and original work titles intact.",
  es: "Write title and description in crisp, natural, idiomatic Spanish. If the poster is bilingual and already includes Spanish text, use the Spanish version; otherwise translate Catalan, English, or any other poster language accurately into natural Spanish. Keep proper nouns, artist/band names, venue names, and original work titles intact.",
  en: "Write title and description in crisp, natural, idiomatic English. If the poster is bilingual and already includes English text, use the English version; otherwise translate Catalan, Spanish, or any other poster language accurately into natural English. Keep proper nouns, artist/band names, venue names, and original work titles intact.",
};

/**
 * Builds the deterministic vision prompt anchored to the current date/weekday
 * in Europe/Madrid, the user's publish locale (`ca` | `es` | `en`), and the
 * live Esdeveniments.cat category list.
 */
export function buildPosterExtractionPrompt(options?: {
  now?: Date;
  categories?: CategorySummaryResponseDTO[];
  locale?: AppLocale;
}): string {
  const now = options?.now ?? new Date();
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const { ymd, weekday } = getMadridDateAnchor(now);
  const categories = options?.categories ?? [];
  const categorySection =
    categories.length > 0
      ? `\nALLOWED CATEGORY SLUGS (pick 1 to 3 exact slugs only):\n${categories
          .map((cat) => `- ${cat.slug} (${cat.name})`)
          .join("\n")}\n`
      : "\nIf no category list is provided, return an empty categories array.\n";

  return `You transcribe and structure event data from a poster image for Esdeveniments.cat.
Reference date: Today is ${weekday}, ${ymd} (Europe/Madrid timezone).

STRICT ZERO-ASSUMPTION RULES:
1. Extract ONLY facts explicitly printed or unmistakably visible on the poster. Never guess, infer, extrapolate, or fill gaps from outside knowledge about an artist, venue, organizer, or past editions.
2. When ANY field is missing, cropped, blurry, or ambiguous, return null (or [] for categories, false for booleans) — NEVER guess:
   - No price printed -> price=null (never assume free or paid).
   - No municipality printed -> town=null (never guess a town from a venue name, street, logo, or language).
   - No website/ticket URL printed -> url=null (never convert @social handles or organizer names into URLs).
   - No end time or end date printed -> endDate=null (never estimate duration).
   - No readable calendar date printed -> startDate=null (never fall back to today's date).
   - Event type not clearly supported by visible poster content -> categories=[].
3. If the image is NOT an event poster or has no readable event information, return null for every nullable field, false for booleans, and [] for categories.
4. Return real JSON null for unknown fields — NEVER placeholder text like "null", "N/A", "TBD", or "desconegut".

DESCRIPTION CRAFT (for Esdeveniments.cat event pages):
- ${OUTPUT_LANGUAGE_GUIDANCE[locale]}
- The event page ALREADY displays the title, date, time, venue, and town above the description. Do NOT open with robotic boilerplate like "Aquest esdeveniment se celebrarà el dia…" / "Este evento se celebrará…" / "This event takes place on…".
- Open with a factual 1–2 sentence hook (under 160 characters) summarizing ONLY what the poster visibly announces.
- Include only concrete details visibly printed on the poster (performers/speakers, schedule/programme, registration or entry notes, accessibility, age range, organizers/collaborators). Do NOT invent audience claims, artist bios, venue descriptions, or marketing clichés ("experiència inoblidable", "no t'ho perdis", "per a tots els públics", "unforgettable experience") unless explicitly printed.
- If the poster has very little text, write a brief 1-sentence factual description — or null if only a title/date/place appear with nothing else to describe. Never pad.
- Formatting: 1 to 3 paragraphs separated by \\n\\n. You may use **bold** sparingly for programme sections. NEVER use Markdown # headings or HTML tags.

DATES & TIMES (Europe/Madrid):
- Format YYYY-MM-DDTHH:mm when a start time is visibly printed (24h, e.g. 20:00), or YYYY-MM-DD when only a date is printed.
- If a 4-digit year IS visibly printed on the poster, preserve it verbatim and set hasExplicitYear=true.
- If day and month are visibly printed WITHOUT a 4-digit year, set hasExplicitYear=false:
  * If a weekday is also printed (e.g. "dissabte 29 de maig"), pick the nearest year within ±1 year where that month/day falls on that weekday.
  * Otherwise pick the next upcoming occurrence on or after ${ymd} (do not assume a past year when no year or weekday indicates it).
- Set isAllDay=true ONLY when date(s) have no start time printed.
- For multi-event festival programmes, set isMultiEvent=true and use the umbrella title and full printed date span.

TOWN, VENUE, URL & PRICE:
- town: ONLY a municipality name visibly printed on the poster. When it is a Catalan municipality, use its official Catalan spelling (e.g. "Cardedeu", "Mataró", "Barcelona", "El Masnou", "Girona" not "Gerona", "Lleida" not "Lérida", "Sant Cugat del Vallès" not "San Cugat del Vallés"). Never include comarca or venue. Return null if no town is printed.
- location: ONLY the specific venue, square, or street address visibly printed on the poster, without repeating the town name. Return null if none is printed.
- url: ONLY a website or ticket URL visibly printed on the poster. Return null if none is printed.
- price: Transcribe ONLY the exact printed price text (e.g. "Entrada lliure", "12 €", "Anticipada 8,50 € / Taquilla 10 €", "Taquilla inversa"). Do NOT call "taquilla inversa" free. Return null if no price is printed.
${categorySection}
Return ONLY the JSON object matching the schema.`;
}

// Escapes raw control characters inside JSON string literals only, preserving
// backslash escapes (so a malformed escape like `\t` with raw tab still throws).
const escapeControlCharsInStrings = (text: string): string =>
  text.replace(/"(?:[^"\\]|\\[\s\S])*"/g, (str) =>
    str.replace(/\\[\s\S]|[\x00-\x1f]/g, (m) =>
      m.length === 2
        ? m
        : "\\u" + m.charCodeAt(0).toString(16).padStart(4, "0"),
    ),
  );

function tryParseJsonWithControlEscape(candidate: string): unknown {
  try {
    return JSON.parse(candidate);
  } catch {
    return JSON.parse(escapeControlCharsInStrings(candidate));
  }
}

/**
 * Parses a JSON object returned by an LLM, tolerating markdown code fences,
 * stray surrounding prose from non-strict fallback models, and unescaped
 * line breaks inside JSON string values.
 */
export function parseAiJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  try {
    return tryParseJsonWithControlEscape(cleaned);
  } catch (firstError) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const sliced = cleaned.slice(firstBrace, lastBrace + 1);
      return tryParseJsonWithControlEscape(sliced);
    }
    throw firstError;
  }
}

const RawPosterExtractionSchema = z.object({
  title: z.string().nullish(),
  description: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  isAllDay: z.boolean().nullish(),
  hasExplicitYear: z.boolean().nullish(),
  isMultiEvent: z.boolean().nullish(),
  town: z.string().nullish(),
  location: z.string().nullish(),
  url: z.string().nullish(),
  price: z.string().nullish(),
  categories: z.array(z.string()).nullish(),
});

function cleanOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || MISSING_SENTINELS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

function cleanSingleLine(
  value: string | null | undefined,
  maxChars: number,
): string | null {
  const cleaned = cleanOptionalText(value);
  if (!cleaned) return null;
  const collapsed = stripHtmlTags(cleaned).replace(/\s+/g, " ").trim();
  return collapsed ? truncateAtWord(collapsed, maxChars) : null;
}

function cleanDescription(value: string | null | undefined): string | null {
  const cleaned = cleanOptionalText(value);
  if (!cleaned) return null;
  const normalized = stripHtmlTags(cleaned)
    .replace(/\r\n?/g, "\n")
    // Strip Markdown heading prefixes (#, ##, ###) that processDescription renders literally.
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return normalized ? truncateAtWord(normalized, MAX_DESCRIPTION_CHARS) : null;
}

function formatUtcInstantInMadrid(instant: Date): { date: string; time: string } | null {
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE_MADRID,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const rawHour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;
  if (!year || !month || !day || !rawHour || !minute) return null;
  const hour = rawHour === "24" ? "00" : rawHour;
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

function parsePosterDateToken(
  raw: string | null | undefined,
  currentYear: number,
): { date: string; time: string | null } | null {
  const cleaned = cleanOptionalText(raw);
  if (!cleaned) return null;

  // Explicit timezone offset (Z or +/-HH:mm): validate the calendar date FIRST
  // (JS Date silently rolls impossible dates like 2026-02-31 into March!), then
  // convert to Europe/Madrid wall time.
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(cleaned)) {
    const datePrefixMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(cleaned);
    if (!datePrefixMatch) return null;
    try {
      splitLocalDateTime(`${datePrefixMatch[1]}T${datePrefixMatch[2]}`);
    } catch {
      return null;
    }
    const converted = formatUtcInstantInMadrid(new Date(cleaned));
    if (!converted) return null;
    const year = Number(converted.date.slice(0, 4));
    if (year < currentYear - 1 || year > currentYear + 3) return null;
    return converted;
  }

  // Local wall-clock string: "YYYY-MM-DD", "YYYY-MM-DD HH:mm", "YYYY-MM-DDTHH:mm(:ss)?"
  const normalized = cleaned
    .replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/, "$1T$2")
    .replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}):\d{2}$/, "$1");

  const hasTime = normalized.includes("T");
  try {
    const { date, time } = splitLocalDateTime(normalized);
    const year = Number(date.slice(0, 4));
    if (year < currentYear - 1 || year > currentYear + 3) return null;
    return { date, time: hasTime ? time : null };
  } catch {
    return null;
  }
}

/** Adds one hour in civil wall-clock time, rolling cleanly across midnight. */
function addOneHourWallClock(date: string, time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + 60;
  if (totalMinutes >= 24 * 60) {
    const nextDay = addDaysYmd(date, 1);
    const wrapped = totalMinutes - 24 * 60;
    const nextH = String(Math.floor(wrapped / 60)).padStart(2, "0");
    const nextM = String(wrapped % 60).padStart(2, "0");
    return `${nextDay}T${nextH}:${nextM}`;
  }
  const nextH = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const nextM = String(totalMinutes % 60).padStart(2, "0");
  return `${date}T${nextH}:${nextM}`;
}

function shiftYmdByYears(ymd: string, years: number): string | null {
  const [y, m, d] = ymd.split("-").map(Number);
  const candidate = `${String(y + years).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  try {
    return splitLocalDateTime(candidate).date;
  } catch {
    return null;
  }
}

function shiftLocalDateTimeByYears(value: string, years: number): string | null {
  const tIndex = value.indexOf("T");
  if (tIndex === -1) return shiftYmdByYears(value, years);
  const shiftedDay = shiftYmdByYears(value.slice(0, tIndex), years);
  return shiftedDay ? `${shiftedDay}${value.slice(tIndex)}` : null;
}

function normalizeDates(
  rawStart: string | null | undefined,
  rawEnd: string | null | undefined,
  rawIsAllDay: boolean | null | undefined,
  currentYear: number,
  todayYmd: string,
  hasExplicitYear: boolean,
): { startDate: string | null; endDate: string | null; isAllDay: boolean } {
  const start = parsePosterDateToken(rawStart, currentYear);
  if (!start) {
    return { startDate: null, endDate: null, isAllDay: false };
  }

  const end = parsePosterDateToken(rawEnd, currentYear);
  const isAllDay =
    start.time === null || (rawIsAllDay === true && start.time === "00:00");

  let result: { startDate: string; endDate: string; isAllDay: boolean };

  if (isAllDay) {
    const endDay = end && end.date >= start.date ? end.date : start.date;
    result = {
      startDate: `${start.date}T00:00`,
      endDate: `${endDay}T23:59`,
      isAllDay: true,
    };
  } else {
    const startValue = `${start.date}T${start.time}`;
    if (end) {
      // Same-day overnight span (e.g. 23:30 -> 02:00): roll end to the next day.
      if (end.date === start.date && end.time && end.time < start.time!) {
        result = {
          startDate: startValue,
          endDate: `${addDaysYmd(start.date, 1)}T${end.time}`,
          isAllDay: false,
        };
      } else {
        const endValue = `${end.date}T${end.time ?? "23:59"}`;
        result =
          endValue > startValue
            ? { startDate: startValue, endDate: endValue, isAllDay: false }
            : {
                startDate: startValue,
                endDate: addOneHourWallClock(start.date, start.time!),
                isAllDay: false,
              };
      }
    } else {
      // No valid end time printed: default +1h with midnight rollover so start !== end.
      result = {
        startDate: startValue,
        endDate: addOneHourWallClock(start.date, start.time!),
        isAllDay: false,
      };
    }
  }

  // Deterministic guard: when no 4-digit year was printed on the poster and the
  // entire extracted range already ended before today, roll forward +1 year so
  // yearless upcoming posters never land on an unpublishable past date.
  // Ongoing exhibitions (end >= today) and explicitly printed years stay untouched.
  if (!hasExplicitYear && result.endDate.slice(0, 10) < todayYmd) {
    const shiftedStart = shiftLocalDateTimeByYears(result.startDate, 1);
    const shiftedEnd = shiftLocalDateTimeByYears(result.endDate, 1);
    if (shiftedStart && shiftedEnd) {
      return {
        startDate: shiftedStart,
        endDate: shiftedEnd,
        isAllDay: result.isAllDay,
      };
    }
  }

  return result;
}

/**
 * Deterministic price resolver following strict Catalan pricing rules:
 * - Donation-only ("taquilla inversa", "aportació voluntària") -> unknown + literal originalPrice, flagged
 * - Free ONLY when every visible tier is free ("Entrada lliure", "Gratuït", "0 €")
 * - Single paid amount -> paid with exact numeric amount
 * - Multi-tier or mixed free+paid ("Gratuït per a socis · 5 € no socis",
 *   "Anticipada 8,50 € / Taquilla 10 €") -> paid at lowest paid tier + literal originalPrice, flagged
 */
export function resolvePosterPrice(
  rawPrice: string | null | undefined,
): PosterPriceResolution | null {
  const text = getEventPriceText(rawPrice);
  if (!text) return null;

  const normalized = normalizeForSearch(text);

  // Extract all explicit euro amounts (e.g. "8,50 €", "10 €", "5 euros").
  const euroMatches: number[] = [];
  for (const match of text.matchAll(EURO_AMOUNT_GLOBAL_RE)) {
    const rawNum = match[1] ?? match[2];
    if (!rawNum) continue;
    const parsed = Number(rawNum.replace(",", "."));
    if (Number.isFinite(parsed)) euroMatches.push(parsed);
  }
  const paidAmounts = euroMatches.filter((amount) => amount > 0);

  // Donation-based entry ("taquilla inversa", "aportació voluntària", including
  // suggested amounts like "Taquilla inversa (aportació recomanada 5 €)") is
  // never a fixed paid ticket or free admission.
  if (DONATION_PRICE_RE.test(normalized)) {
    return {
      priceType: "unknown",
      priceAmount: "",
      originalPrice: text,
      needsReview: true,
    };
  }

  // Exact free text (no paid tiers alongside it).
  if (isFreePriceText(text) && paidAmounts.length === 0) {
    return {
      priceType: "free",
      priceAmount: "",
      originalPrice: null,
      needsReview: false,
    };
  }

  // Single unambiguous amount ("12 €", "8,50 €", "15").
  const singleAmount = parseSchemaPrice(text);
  if (singleAmount !== null) {
    if (singleAmount === 0) {
      return {
        priceType: "free",
        priceAmount: "",
        originalPrice: null,
        needsReview: false,
      };
    }
    return {
      priceType: "paid",
      priceAmount: String(singleAmount),
      originalPrice: null,
      needsReview: false,
    };
  }

  // Mixed or multi-tier pricing: pick the lowest paid amount, preserve literal
  // text in originalPrice, and flag for review.
  if (paidAmounts.length > 0) {
    const lowestPaid = Math.min(...paidAmounts);
    const hasFreeTier = FREE_MENTION_RE.test(normalized) || euroMatches.includes(0);
    const hasMultipleTiers = paidAmounts.length > 1 || hasFreeTier;
    return {
      priceType: "paid",
      priceAmount: String(lowestPaid),
      originalPrice: text,
      needsReview: hasMultipleTiers,
    };
  }

  // Free text with extra wording (e.g. "Entrada lliure fins a completar aforament",
  // "Entrée gratuite") and zero paid amounts or subset qualifiers -> free.
  if (FREE_MENTION_RE.test(normalized) && !RESTRICTED_FREE_RE.test(normalized)) {
    return {
      priceType: "free",
      priceAmount: "",
      originalPrice: null,
      needsReview: false,
    };
  }

  return {
    priceType: "unknown",
    priceAmount: "",
    originalPrice: text,
    needsReview: true,
  };
}

function normalizeCategories(
  rawCategories: string[] | null | undefined,
  allowedCategories?: CategorySummaryResponseDTO[],
): string[] {
  if (!Array.isArray(rawCategories) || rawCategories.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];

  if (allowedCategories && allowedCategories.length > 0) {
    const lookup = new Map<string, string>();
    for (const cat of allowedCategories) {
      lookup.set(normalizeForSearch(cat.slug), cat.slug);
      lookup.set(normalizeForSearch(cat.name), cat.slug);
    }
    for (const item of rawCategories) {
      const key = normalizeForSearch(item);
      const matched = key ? lookup.get(key) : undefined;
      if (matched && !seen.has(matched)) {
        seen.add(matched);
        out.push(matched);
        if (out.length >= MAX_CATEGORIES) break;
      }
    }
    return out;
  }

  for (const item of rawCategories) {
    const cleaned = cleanOptionalText(item);
    if (!cleaned) continue;
    const key = normalizeForSearch(cleaned);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(cleaned);
      if (out.length >= MAX_CATEGORIES) break;
    }
  }
  return out;
}

/**
 * Validates and normalizes an untrusted AI poster-extraction payload into a
 * clean `PosterExtractedEvent`, returning `null` only if the input is not an
 * object matching the expected schema.
 */
export function parsePosterExtraction(
  input: unknown,
  options?: {
    now?: Date;
    allowedCategories?: CategorySummaryResponseDTO[];
  },
): PosterExtractedEvent | null {
  const parsed = RawPosterExtractionSchema.safeParse(input);
  if (!parsed.success) {
    console.error("parsePosterExtraction: invalid payload structure");
    return null;
  }

  const data = parsed.data;
  const { ymd: todayYmd, year: currentYear } = getMadridDateAnchor(
    options?.now ?? new Date(),
  );

  const title = cleanSingleLine(data.title, MAX_TITLE_CHARS);
  const description = cleanDescription(data.description);
  const town = cleanSingleLine(data.town, MAX_TOWN_CHARS);

  const rawLocation = cleanSingleLine(data.location, MAX_LOCATION_CHARS);
  const strippedLocation = rawLocation
    ? dropPlaceParts(rawLocation, town) || rawLocation
    : null;
  const location = strippedLocation
    ? truncateAtWord(strippedLocation, MAX_LOCATION_CHARS)
    : null;

  const rawUrl = cleanOptionalText(data.url);
  const normalizedUrl = rawUrl ? normalizeUrl(rawUrl) : "";
  const url =
    normalizedUrl && isValidEventUrl(normalizedUrl) ? normalizedUrl : null;

  const rawPrice = cleanSingleLine(data.price, MAX_PRICE_CHARS);
  const price = getEventPriceText(rawPrice);
  const priceResolution = resolvePosterPrice(price);

  const { startDate, endDate, isAllDay } = normalizeDates(
    data.startDate,
    data.endDate,
    data.isAllDay,
    currentYear,
    todayYmd,
    data.hasExplicitYear !== false,
  );

  const dateInferred = Boolean(startDate && data.hasExplicitYear === false);
  const isMultiEvent = Boolean(data.isMultiEvent);

  const categories = normalizeCategories(
    data.categories,
    options?.allowedCategories,
  );

  return {
    title,
    description,
    startDate,
    endDate,
    isAllDay,
    dateInferred,
    isMultiEvent,
    town,
    location,
    url,
    price,
    priceResolution,
    categories,
  };
}

/** True when at least one meaningful event field was extracted from the poster. */
export function hasExtractedEventData(extracted: PosterExtractedEvent): boolean {
  return Boolean(
    extracted.title ||
      extracted.description ||
      extracted.startDate ||
      extracted.town ||
      extracted.location ||
      extracted.url ||
      extracted.price ||
      extracted.categories.length > 0,
  );
}
