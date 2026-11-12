import type { EventDetailResponseDTO } from "types/api/event";
import { getFormattedDate, normalizeEndTime } from "@utils/date-helpers";
import {
  capitalizeFirstLetter,
  escapeRegex,
  formatPlaceName,
} from "./string-helpers";
import { formatPlacePreposition } from "@utils/helpers";
import type { EventCopyLabels, StringHelperLabels } from "types/common";
import localeLabels from "../i18n/locale-labels.generated.json";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";

const defaultEventCopyLabels: EventCopyLabels = localeLabels.utils
  .EventCopy as EventCopyLabels;
const eventCopyStringLabels: StringHelperLabels = localeLabels.utils
  .StringHelpers as StringHelperLabels;

// Stands in for the title while the rest of the sentence is post-processed,
// so place capitalization never rewrites the organizer's title.
const TITLE_SLOT = "\u0000";

function isValidTime(t: string | null): t is string {
  return !!t && t !== "00:00";
}

/**
 * Strip seconds from time string (e.g., "18:30:00" → "18:30")
 * Handles HH:MM:SS and HH:MM formats
 */
function formatTimeWithoutSeconds(time: string): string {
  // Match HH:MM:SS or HH:MM format
  const match = time.match(/^(\d{1,2}:\d{2})(:\d{2})?$/);
  if (match) {
    return match[1]; // Return only HH:MM part
  }
  return time; // Return as-is if format doesn't match
}

/**
 * The title as the organizer wrote it, ready to sit inside the sentence's
 * quotes: whitespace collapsed, outer quotes and closing punctuation dropped
 * (the template adds its own). Titles are names (all caps, sentences, codes),
 * so the case is kept and no article is guessed.
 */
function toQuotedTitle(rawTitle: string): string {
  let title = rawTitle.replace(/\s+/g, " ").trim();
  const wrapped = title.match(/^["“«](.*)["”»]$/);
  if (wrapped && !/["“”«»]/.test(wrapped[1])) title = wrapped[1].trim();
  return title.replace(/[\s.,:;]+$/, "");
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
      // "l'" elides with no space ("a l'Escala"); keep the article lowercase.
      const articleMatch = placePortion.match(
        /^(?:(l['’])\s*|(el|la|els|les)\s+)(\S.*)$/i
      );
      if (articleMatch) {
        const article = (articleMatch[1] ?? articleMatch[2]).toLowerCase();
        const rest = articleMatch[3];
        const formattedRest = formatPlaceName(rest);
        const spacer = /['’]$/.test(article) ? "" : " ";
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
  const title = toQuotedTitle(event.title || "");
  if (!title) return "";

  const cityName = formatPlaceName(event.city?.name || "");
  const regionName = formatPlaceName(event.region?.name || "");
  const formattedLocation = formatPlaceName(event.location || "");

  const { formattedStart, formattedEnd, nameDay } = await getFormattedDate(
    event.startDate,
    event.endDate,
    locale
  );

  const placeSummary = cityName || regionName || formattedLocation || "";

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

  const normalizedEndTime = normalizeEndTime(event.startTime, event.endTime);
  const startTimeLabel = isValidTime(event.startTime)
    ? formatTimeWithoutSeconds(event.startTime)
    : "";
  const endTimeLabel = isValidTime(normalizedEndTime)
    ? formatTimeWithoutSeconds(normalizedEndTime)
    : "";

  const sentenceLabels = labels.sentence;
  const datePart = formattedEnd
    ? sentenceLabels.dateRange
        .replace("{start}", formattedStart)
        .replace("{end}", formattedEnd)
    : sentenceLabels.dateSingle
        // Catalan and Spanish lowercase weekdays mid-sentence; English doesn't.
        .replace("{nameDay}", locale === "en" ? nameDay : nameDay.toLowerCase())
        .replace("{start}", formattedStart);

  // Compose time suffix: use range template when both start and end exist
  const timeSuffix = startTimeLabel
    ? endTimeLabel
      ? sentenceLabels.timeSuffixRange
          .replace("{start}", startTimeLabel)
          .replace("{end}", endTimeLabel)
      : sentenceLabels.timeSuffix.replace("{time}", startTimeLabel)
    : "";
  const placeSuffix = preposition
    ? sentenceLabels.placeSuffix.replace("{place}", preposition)
    : "";
  const sentence = sentenceLabels.sentence
    .replace("{title}", TITLE_SLOT)
    .replace("{date}", datePart)
    .replace("{time}", timeSuffix)
    .replace("{place}", placeSuffix);

  // A function replacer: a title with "$&" or "$1" must stay literal.
  return capitalizePlaces(sentence).replace(TITLE_SLOT, () => title);
}
