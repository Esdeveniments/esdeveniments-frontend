/**
 * Category UI configuration for homepage and priority ordering.
 * Single source of truth for category labels, priority status, and display order.
 *
 * Note: Icons are imported in components that use this config to avoid
 * React component dependencies in config files.
 */

export type CategoryConfig = {
  labelKey: string;
  isPriority: boolean;
};

/**
 * Category configuration mapping every backend slug to its UI label key
 * (`Config.Categories.<labelKey>` in messages/*.json) and priority status.
 * Read labels through `getCategoryLabel` (utils/category-helpers.ts).
 * Order matters: priority categories should be listed first to maintain display order.
 */
export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  "festes-populars": {
    labelKey: "festesPopulars",
    isPriority: true,
  },
  "fires-i-mercats": {
    labelKey: "firesIMercats",
    isPriority: true,
  },
  "familia-i-infants": {
    labelKey: "familiaIInfants",
    isPriority: true,
  },
  musica: {
    labelKey: "musica",
    isPriority: true,
  },
  teatre: {
    labelKey: "teatre",
    isPriority: true,
  },
  exposicions: {
    labelKey: "exposicions",
    isPriority: false,
  },
  literatura: {
    labelKey: "literatura",
    isPriority: false,
  },
  "tallers-i-formacio": {
    labelKey: "tallersIFormacio",
    isPriority: false,
  },
  dansa: {
    labelKey: "dansa",
    isPriority: false,
  },
  "salut-i-benestar": {
    labelKey: "salutIBenestar",
    isPriority: false,
  },
  esport: {
    labelKey: "esport",
    isPriority: false,
  },
  "patrimoni-cultural": {
    labelKey: "patrimoniCultural",
    isPriority: false,
  },
  "serveis-municipals": {
    labelKey: "serveisMunicipals",
    isPriority: false,
  },
  "gent-gran": {
    labelKey: "gentGran",
    isPriority: false,
  },
  cinema: {
    labelKey: "cinema",
    isPriority: false,
  },
  altres: {
    labelKey: "altres",
    isPriority: false,
  },
} as const;

/**
 * Priority category slugs in display order.
 * Derived from CATEGORY_CONFIG to maintain single source of truth.
 */
export const PRIORITY_CATEGORY_SLUGS = Object.entries(CATEGORY_CONFIG)
  .filter(([, config]) => config.isPriority)
  .map(([slug]) => slug);

/**
 * Maximum number of category sections to display on homepage.
 */
export const MAX_CATEGORY_SECTIONS = 5;
