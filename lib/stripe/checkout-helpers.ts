/**
 * Stripe Checkout parameter builders
 * These helpers build URLSearchParams for Stripe checkout sessions
 */
import { BASE_PRICES_CENTS } from "@config/pricing";
import type { SponsorDuration, GeoScope } from "types/sponsor";
import { DURATION_DAYS, SPONSOR_DURATIONS } from "types/sponsor";
import type { AppLocale } from "types/i18n";
import { ensureLocale } from "@utils/i18n-routing";
import { withLocalePath } from "@utils/i18n-seo";

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
  AppLocale,
  { prefix: string; suffix: string }
> = {
  ca: { prefix: "Patrocini", suffix: "dies" },
  es: { prefix: "Patrocinio", suffix: "días" },
  en: { prefix: "Sponsorship", suffix: "days" },
  fr: { prefix: "Sponsoring", suffix: "jours" },
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
 * Stripe Checkout UI locale per app locale (Stripe doesn't support Catalan)
 */
export const STRIPE_CHECKOUT_LOCALE: Record<AppLocale, "es" | "en" | "fr"> = {
  ca: "es",
  es: "es",
  en: "en",
  fr: "fr",
};

/**
 * Product names by locale (auto-generated from DURATION_DAYS)
 */
export const PRODUCT_NAMES = Object.fromEntries(
  Object.entries(PRODUCT_NAME_TEMPLATES).map(([loc, template]) => [
    loc,
    buildProductNames(template),
  ])
) as Record<AppLocale, Record<SponsorDuration, string>>;

/**
 * Custom field labels by locale (max 3 fields in Stripe Checkout)
 * Place is pre-selected on our site, so we only need business name and target URL
 */
export const CUSTOM_FIELD_LABELS: Record<
  AppLocale,
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
  fr: {
    businessName: "Nom de l'entreprise",
    targetUrl: "URL de votre site web (facultatif)",
  },
};

/**
 * Product descriptions by locale
 */
export const PRODUCT_DESCRIPTIONS: Record<AppLocale, string> = {
  ca: "dies de patrocini a Esdeveniments.cat",
  es: "días de patrocinio en Esdeveniments.cat",
  en: "days of sponsorship on Esdeveniments.cat",
  fr: "jours de sponsoring sur Esdeveniments.cat",
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
  const appLocale = ensureLocale(locale);
  const productNames = PRODUCT_NAMES[appLocale];
  const descriptionSuffix = PRODUCT_DESCRIPTIONS[appLocale];

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
  const labels = CUSTOM_FIELD_LABELS[ensureLocale(locale)];

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

/** Stripe Tax code for general electronically supplied services. */
const SPONSOR_TAX_CODE = "txcd_10000000";

/**
 * Checkbox text: accepting the terms and asking for the sponsorship to start
 * on payment, so a consumer who withdraws within 14 days pays only for the
 * days already provided.
 */
const TERMS_ACCEPTANCE: Record<AppLocale, (termsUrl: string) => string> = {
  ca: (url) =>
    `Accepto les [condicions de venda](${url}) i demano que el patrocini comenci en pagar. Si desisteixo dins de 14 dies, em retornareu la part dels dies que no s'hagin fet.`,
  es: (url) =>
    `Acepto las [condiciones de venta](${url}) y pido que el patrocinio empiece al pagar. Si desisto en 14 días, me devolveréis la parte de los días que no se hayan prestado.`,
  en: (url) =>
    `I accept the [terms of sale](${url}) and ask for the sponsorship to start on payment. If I withdraw within 14 days, you will refund the days not yet provided.`,
  fr: (url) =>
    `J'accepte les [conditions de vente](${url}) et je demande que le sponsoring commence dès le paiement. Si je me rétracte dans les 14 jours, vous me rembourserez la part des jours non fournis.`,
};

/**
 * Invoice parameters (behind STRIPE_INVOICING_ENABLED): Stripe Tax splits out
 * the IVA already included in the price, Checkout asks for the billing address
 * and an optional NIF or EU VAT ID, issues a paid invoice and requires the
 * terms checkbox (needs the terms URL in the Stripe account's public details).
 */
export function buildInvoicingParams(
  params: URLSearchParams,
  locale: string,
  baseUrl: string
): void {
  const appLocale = ensureLocale(locale);
  const termsUrl = `${baseUrl}${withLocalePath("/termes-servei", appLocale)}`;

  params.append("automatic_tax[enabled]", "true");
  params.append("line_items[0][price_data][tax_behavior]", "inclusive");
  params.append("line_items[0][price_data][product_data][tax_code]", SPONSOR_TAX_CODE);
  params.append("billing_address_collection", "required");
  params.append("tax_id_collection[enabled]", "true");
  params.append("invoice_creation[enabled]", "true");
  params.append("invoice_creation[invoice_data][metadata][product]", "sponsor_banner");
  params.append("consent_collection[terms_of_service]", "required");
  params.append(
    "custom_text[terms_of_service_acceptance][message]",
    TERMS_ACCEPTANCE[appLocale](termsUrl)
  );
}
