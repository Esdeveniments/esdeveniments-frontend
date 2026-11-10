import { normalizeForSearch } from "@utils/string-helpers";
import type { EventPriceFormFields } from "types/event";

// `price` is text: a plain amount from the publish form ("0" = free, "10",
// "12.5"), short free text written by the scraper AI ("Gratuït",
// "10 € taquilla · 5 € online"), or null when unknown.

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

const AMOUNT = String.raw`\d{1,4}(?:[.,]\d{1,2})?`;
const PLAIN_AMOUNT = new RegExp(`^${AMOUNT}$`);
// One amount with the currency before or after it: "10 €", "€10", "12,50 euros".
const SINGLE_EURO_AMOUNT = new RegExp(
  `^(?:€\\s*(${AMOUNT})|(${AMOUNT})\\s*(?:€|euros?|eur))$`,
  "i",
);

const toNumber = (amount: string): number => Number(amount.replace(",", "."));

/** A bare amount ("10", "12,50", "0"), as the publish form sends it; else null. */
export function parsePriceAmount(text: string): number | null {
  const trimmed = text.trim();
  return PLAIN_AMOUNT.test(trimmed) ? toNumber(trimmed) : null;
}

/** What the "paid" amount input accepts: a bare amount above zero; else null. */
export function parsePaidAmount(text: string | undefined): number | null {
  const amount = parsePriceAmount(text ?? "");
  return amount !== null && amount > 0 ? amount : null;
}

export function getEventPriceText(price: string | null | undefined): string | null {
  const text = price?.trim();
  return text ? text : null;
}

/** True only when the whole text says "free" (or is the amount 0) and nothing else. */
export function isFreePriceText(text: string): boolean {
  if (parsePriceAmount(text) === 0) return true;
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
  const plain = parsePriceAmount(text);
  if (plain !== null) return plain;
  const match = SINGLE_EURO_AMOUNT.exec(text.trim());
  const amount = match?.[1] ?? match?.[2];
  return amount ? toNumber(amount) : null;
}

/** A bare amount as euros in the page locale ("10 €", "12,50 €", "€10"); other text as is. */
export function formatPriceText(text: string, locale: string): string {
  const amount = parsePriceAmount(text);
  if (amount === null) return text;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

/** Stored price → form fields. Text the form can't show is kept in `originalPrice`. */
export function priceToFormFields(price: string | null | undefined): Required<EventPriceFormFields> {
  const text = getEventPriceText(price);
  const amount = text ? parseSchemaPrice(text) : null;
  if (amount === 0) return { priceType: "free", priceAmount: "", originalPrice: null };
  if (amount !== null) return { priceType: "paid", priceAmount: String(amount), originalPrice: null };
  return { priceType: "unknown", priceAmount: "", originalPrice: text };
}

/** Form fields → the `price` the backend stores: "0", "12.5" or null. */
export function formPriceToPayload(form: EventPriceFormFields): string | null {
  if (form.priceType === "free") return "0";
  if (form.priceType === "paid") {
    const amount = parsePaidAmount(form.priceAmount);
    return amount === null ? null : String(amount);
  }
  return form.originalPrice ?? null;
}
