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
 * Category configuration mapping slug to display label and priority status.
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
