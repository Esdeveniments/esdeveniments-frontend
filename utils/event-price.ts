import { normalizeForSearch } from "@utils/string-helpers";

// `price` is short free text written by the scraper AI ("Gratuït",
// "10 €", "10 € taquilla · 5 € online") or null when unknown.

const FREE_PRICE_TEXTS = new Set([
  "gratuit",
  "gratuita",
  "gratis",
  "gratuito",
  "free",
  "entrada gratuita",
  "entrada gratuit",
  "entrada lliure",
  "entrada libre",
  "acces lliure",
  "acceso libre",
  "free entry",
  "free admission",
]);

// One amount with the currency before or after it: "10 €", "€10", "12,50 euros".
const SINGLE_EURO_AMOUNT =
  /^(?:€\s*(\d{1,4}(?:[.,]\d{1,2})?)|(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:€|euros?|eur))$/i;

export function getEventPriceText(price: string | null | undefined): string | null {
  const text = price?.trim();
  return text ? text : null;
}

/** True only when the whole text says "free" and nothing else. */
export function isFreePriceText(text: string): boolean {
  const normalized = normalizeForSearch(text)
    .replace(/[.!]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return FREE_PRICE_TEXTS.has(normalized);
}

/**
 * Numeric price for schema.org `offers.price` (Google wants a Number), or
 * null when the text is not exactly "free" or one euro amount. Ranges and
 * several ticket types return null so we never publish a wrong price.
 */
export function parseSchemaPrice(text: string): number | null {
  if (isFreePriceText(text)) return 0;
  const match = SINGLE_EURO_AMOUNT.exec(text.trim());
  const amount = match?.[1] ?? match?.[2];
  if (!amount) return null;
  const value = Number(amount.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}
