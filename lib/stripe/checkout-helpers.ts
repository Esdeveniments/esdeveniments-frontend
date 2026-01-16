/**
 * Stripe Checkout parameter builders
 * These helpers build URLSearchParams for Stripe checkout sessions
 */
import { BASE_PRICES_CENTS } from "@config/pricing";
import type { SponsorDuration, GeoScope } from "types/sponsor";
import { DURATION_DAYS, SPONSOR_DURATIONS } from "types/sponsor";

/**
 * Get price in cents for Stripe
 * Uses BASE_PRICES_CENTS directly to avoid EUR round-trip conversion
 */
export function getPriceInCents(
  duration: SponsorDuration,
  geoScope: GeoScope
): number {
  const days = DURATION_DAYS[duration];
  return BASE_PRICES_CENTS[geoScope][
    days as keyof (typeof BASE_PRICES_CENTS)[typeof geoScope]
  ];
}

/**
 * Product name templates by locale
 * Uses DURATION_DAYS to auto-generate names for all durations
 */
const PRODUCT_NAME_TEMPLATES: Record<
  string,
  { prefix: string; suffix: string }
> = {
  ca: { prefix: "Patrocini", suffix: "dies" },
  es: { prefix: "Patrocinio", suffix: "días" },
  en: { prefix: "Sponsorship", suffix: "days" },
};

/**
 * Generate product names for all durations from templates
 */
function buildProductNames(template: {
  prefix: string;
  suffix: string;
}): Record<SponsorDuration, string> {
  const result = {} as Record<SponsorDuration, string>;
  for (const duration of SPONSOR_DURATIONS) {
    result[
      duration
    ] = `${template.prefix} ${DURATION_DAYS[duration]} ${template.suffix}`;
  }
  return result;
}

/**
 * Product names by locale (auto-generated from DURATION_DAYS)
 */
export const PRODUCT_NAMES: Record<string, Record<SponsorDuration, string>> = {
  ca: buildProductNames(PRODUCT_NAME_TEMPLATES.ca),
  es: buildProductNames(PRODUCT_NAME_TEMPLATES.es),
  en: buildProductNames(PRODUCT_NAME_TEMPLATES.en),
};

/**
 * Custom field labels by locale (max 3 fields in Stripe Checkout)
 * Place is pre-selected on our site, so we only need business name and target URL
 */
export const CUSTOM_FIELD_LABELS: Record<
  string,
  { businessName: string; targetUrl: string }
> = {
  ca: {
    businessName: "Nom del negoci",
    targetUrl: "URL del teu web (opcional)",
  },
  es: {
    businessName: "Nombre del negocio",
    targetUrl: "URL de tu web (opcional)",
  },
  en: {
    businessName: "Business name",
    targetUrl: "Your website URL (optional)",
  },
};

/**
 * Product descriptions by locale
 */
export const PRODUCT_DESCRIPTIONS: Record<string, string> = {
  ca: "dies de patrocini a Esdeveniments.cat",
  es: "días de patrocinio en Esdeveniments.cat",
  en: "days of sponsorship on Esdeveniments.cat",
};

/**
 * Build line item parameters for Stripe checkout
 */
export function buildLineItemParams(
  params: URLSearchParams,
  duration: SponsorDuration,
  geoScope: GeoScope,
  locale: string
): void {
  const productNames = PRODUCT_NAMES[locale] || PRODUCT_NAMES.ca;
  const descriptionSuffix =
    PRODUCT_DESCRIPTIONS[locale] || PRODUCT_DESCRIPTIONS.ca;

  params.append("line_items[0][price_data][currency]", "eur");
  params.append(
    "line_items[0][price_data][unit_amount]",
    String(getPriceInCents(duration, geoScope))
  );
  params.append(
    "line_items[0][price_data][product_data][name]",
    productNames[duration]
  );
  params.append(
    "line_items[0][price_data][product_data][description]",
    `${DURATION_DAYS[duration]} ${descriptionSuffix}`
  );
  params.append("line_items[0][quantity]", "1");
}

/**
 * Build custom field parameters for Stripe checkout
 * Collects business name (required) and target URL (optional)
 */
export function buildCustomFieldParams(
  params: URLSearchParams,
  locale: string
): void {
  const labels = CUSTOM_FIELD_LABELS[locale] || CUSTOM_FIELD_LABELS.ca;

  // Field 1: Business name (text) - required
  params.append("custom_fields[0][key]", "business_name");
  params.append("custom_fields[0][label][type]", "custom");
  params.append("custom_fields[0][label][custom]", labels.businessName);
  params.append("custom_fields[0][type]", "text");

  // Field 2: Target URL (text) - optional, where clicks should go
  params.append("custom_fields[1][key]", "target_url");
  params.append("custom_fields[1][label][type]", "custom");
  params.append("custom_fields[1][label][custom]", labels.targetUrl);
  params.append("custom_fields[1][type]", "text");
  params.append("custom_fields[1][optional]", "true");
}

/**
 * Build metadata parameters for Stripe checkout
 * Sets metadata on both session and payment_intent for Dashboard visibility
 */
export function buildMetadataParams(
  params: URLSearchParams,
  duration: SponsorDuration,
  place: string,
  placeName: string,
  geoScope: GeoScope
): void {
  const metadata: Record<string, string> = {
    product: "sponsor_banner",
    duration,
    duration_days: String(DURATION_DAYS[duration]),
    place,
    place_name: placeName,
    geo_scope: geoScope,
  };

  for (const [key, value] of Object.entries(metadata)) {
    params.append(`metadata[${key}]`, value);
    params.append(`payment_intent_data[metadata][${key}]`, value);
  }
}
