/**
 * Category UI configuration for homepage and priority ordering.
 * Single source of truth for category labels, priority status, and display order.
 *
 * Note: Icons are imported in components that use this config to avoid
 * React component dependencies in config files.
 */

export type CategoryConfig = {
  label: string;
  isPriority: boolean;
};

/**
 * Category configuration mapping slug to display label and priority status.
 * Order matters: priority categories should be listed first to maintain display order.
 */
export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  "festes-populars": {
    label: "Festes Populars",
    isPriority: true,
  },
  "fires-i-mercats": {
    label: "Fires i Mercats",
    isPriority: true,
  },
  "familia-i-infants": {
    label: "Família i Infants",
    isPriority: true,
  },
  musica: {
    label: "Música",
    isPriority: true,
  },
  teatre: {
    label: "Teatre",
    isPriority: true,
  },
  exposicions: {
    label: "Exposicions",
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
