// Shared formatting helpers for Google Place / restaurant listings
// Centralizes logic so UI components stay lean.

import { GooglePlace } from "types/api/restaurant";
import { OpenLineInfo } from "types/place-format";
import {
  formatOpeningHours,
  formatConfidence,
} from "utils/format-opening-hours";

/**
 * Format Google price level (numeric 0..4 or enum string) -> € symbols.
 */
export function formatPriceLevelGeneric(price: unknown): string | null {
  if (price === null || price === undefined) return null;
  if (typeof price === "number" && !Number.isNaN(price)) {
    const euros = Math.min(Math.max(price + 1, 1), 5);
    return "€".repeat(euros);
  }
  if (typeof price === "string") {
    const map: Record<string, string> = {
      PRICE_LEVEL_FREE: "€",
      PRICE_LEVEL_INEXPENSIVE: "€€",
      PRICE_LEVEL_MODERATE: "€€€",
      PRICE_LEVEL_EXPENSIVE: "€€€€",
      PRICE_LEVEL_VERY_EXPENSIVE: "€€€€€",
    };
    return map[price] || null;
  }
  return null;
}

/**
 * Join multiple address lines intelligently for a single-line display.
 * - Removes duplicates
 * - Trims whitespace
 * - Joins with ", " while avoiding trailing commas
 */
export function formatAddressLines(lines?: string[] | null): string | null {
  if (!lines || !lines.length) return null;
  const cleaned = lines
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i); // dedupe
  if (!cleaned.length) return null;
  return cleaned.join(", ");
}

/**
 * Returns structured open line info combining hours + open confidence.
 * Assumes backend already filtered out permanently/temporarily closed places.
 */
export function getOpenLineInfo(place: GooglePlace): OpenLineInfo | null {
  const hoursText =
    formatOpeningHours(place.opening_info) ||
    (!place.opening_info && place.hours_display) ||
    null;
  const confidence =
    place.opening_info?.open_confidence || place.open_confidence;
  const formatted = confidence ? formatConfidence(confidence) : null;
  let openLabel: string | null = null;
  if (formatted) openLabel = /confirmat/i.test(formatted) ? "Obert" : formatted;
  if (!hoursText && !openLabel) return null;
  const toneClass =
    confidence === "confirmed"
      ? "text-green-700"
      : confidence === "inferred"
      ? "text-amber-700"
      : "text-gray-600";
  return { hoursText, openLabel, toneClass };
}
