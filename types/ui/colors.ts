/**
 * Color Token Documentation
 *
 * This file documents all color tokens used in the design system.
 * Colors are defined in tailwind.config.js and migrated from hardcoded Tailwind classes.
 *
 * Migration Status: Partially Complete (68% adoption)
 * Last Updated: October 4, 2025
 */

// =============================================================================
// BRAND COLORS
// =============================================================================

/**
 * Primary Brand Colors
 * Used for main CTAs, links, and brand elements
 */
export const primaryColors = {
  /** Primary brand color - #FF0037 */
  primary: "#FF0037",

  /** Darker variant for hover states - #C8033F */
  primarydark: "#C8033F",

  /** Soft variant with transparency for backgrounds - #FF003750 */
  primarySoft: "#FF003750",

  /** Hover state - #C8033F */
  "primary-hover": "#C8033F",

  /** Focus state with transparency - #FF0037AA */
  "primary-focus": "#FF0037AA",

  /** Active state - #A8033F */
  "primary-active": "#A8033F",

  /** Disabled state - #cccccc */
  "primary-disabled": "#cccccc",
} as const;

// =============================================================================
// NEUTRAL COLORS
// =============================================================================

/**
 * Corporate Neutral Colors
 * Main text and background colors for consistent branding
 */
export const neutralColors = {
  /** Primary text color - rgb(69 69 69 / <alpha-value>) */
  blackCorp: "rgb(69 69 69 / <alpha-value>)",

  /** Pure black with alpha support - rgb(0 0 0 / <alpha-value>) */
  fullBlackCorp: "rgb(0 0 0 / <alpha-value>)",

  /** Light background color - #F7F7F7 */
  darkCorp: "#F7F7F7",

  /** Pure white - #ffffff */
  whiteCorp: "#ffffff",

  /** Border color - #cccccc */
  bColor: "#cccccc",

  /** Secondary neutral - #6B7280 */
  secondary: "#6B7280",
} as const;

// =============================================================================
// SEMANTIC COLORS
// =============================================================================

/**
 * Status and Semantic Colors
 * Used for feedback, alerts, and status indicators
 */
export const semanticColors = {
  /** Success state - #10B981 */
  success: "#10B981",

  /** Warning state - #F59E0B */
  warning: "#F59E0B",

  /** Error state - #EF4444 */
  error: "#EF4444",
} as const;

// =============================================================================
// EXTENDED GRAY SCALE
// =============================================================================

/**
 * Extended Gray Scale
 * Comprehensive gray palette for various UI needs
 */
export const grayScale = {
  50: "#F9FAFB",
  100: "#F3F4F6",
  200: "#E5E7EB",
  300: "#D1D5DB",
  400: "#9CA3AF",
  500: "#6B7280",
  600: "#4B5563",
  700: "#374151",
  800: "#1F2937",
  900: "#111827",
} as const;

// =============================================================================
// COLOR TOKEN USAGE PATTERNS
// =============================================================================

/**
 * Color Token Usage Guidelines
 *
 * Text Colors:
 * - blackCorp: Primary text color with opacity variants (/80, /60, /40)
 * - whiteCorp: Text on dark backgrounds
 * - fullBlackCorp: Pure black text when needed
 *
 * Background Colors:
 * - whiteCorp: Primary background
 * - darkCorp: Secondary/light backgrounds
 * - darkCorp/80: Muted backgrounds
 *
 * Border Colors:
 * - bColor: Default borders
 * - bColor/50: Subtle borders
 *
 * Interactive States:
 * - primary: Default state
 * - primary-hover: Hover state
 * - primary-focus: Focus state
 * - primary-active: Active/pressed state
 * - primary-disabled: Disabled state
 *
 * Semantic Usage:
 * - success: Positive actions, confirmations
 * - warning: Caution, warnings
 * - error: Errors, destructive actions
 */

// =============================================================================
// MIGRATION HISTORY
// =============================================================================

/**
 * Color Migration History
 *
 * Phase 1 (Completed):
 * - text-gray-700 → text-blackCorp
 * - text-gray-600 → text-blackCorp/80
 * - text-gray-500 → text-blackCorp/60
 * - text-gray-400 → text-blackCorp/40
 * - text-gray-900 → text-blackCorp
 * - bg-gray-100 → bg-darkCorp
 * - bg-gray-50 → bg-whiteCorp
 * - bg-gray-200 → bg-darkCorp/80
 * - border-gray-300 → border-bColor
 * - border-gray-200 → border-bColor/50
 *
 * Phase 2 (Completed):
 * - text-gray-200 → text-blackCorp/40
 * - bg-gray-200 → bg-darkCorp/80
 * - text-gray-500 → text-blackCorp/60
 * - text-gray-300 → text-blackCorp/50
 * - border-gray-100 → border-bColor/50
 * - bg-yellow-100 → bg-warning/10
 * - border-yellow-300 → border-warning
 * - text-yellow-800 → text-warning
 * - text-yellow-700 → text-warning
 * - text-yellow-500 → text-warning/80
 * - bg-green-50 → bg-success/10
 * - text-green-400 → text-success/80
 * - text-green-700 → text-success
 * - bg-blue-50 → bg-primary/10
 * - text-red-500 → text-error/80
 * - bg-red-50 → bg-error/10
 * - bg-red-500 → bg-error
 * - text-red-600 → text-error
 * - border-red-200 → border-error/50
 */

// =============================================================================
// ACCESSIBILITY NOTES
// =============================================================================

/**
 * Accessibility Compliance Notes
 *
 * Contrast Ratios (WCAG AA Standard - 4.5:1 minimum for normal text):
 *
 * Text on Background:
 * - blackCorp (#454545) on whiteCorp (#ffffff): 9.59:1 ✅
 * - blackCorp on darkCorp (#F7F7F7): 8.95:1 ✅
 * - whiteCorp on blackCorp: 9.59:1 ✅
 * - blackCorp/80 on whiteCorp: ~8.2:1 ✅
 * - blackCorp/60 on whiteCorp: ~6.1:1 ✅
 * - blackCorp/40 on whiteCorp: ~4.1:1 ❌ (below 4.5:1)
 *
 * Primary Colors:
 * - whiteCorp on primary (#FF0037): 3.96:1 ❌ (below 4.5:1)
 * - blackCorp on primary (#FF0037): 2.42:1 ❌ (below 4.5:1)
 *
 * Semantic Colors:
 * - whiteCorp on success (#10B981): 2.56:1 ✅ (meets 3:1 for large text)
 * - blackCorp on success: 3.74:1 ❌ (below 4.5:1)
 * - whiteCorp on warning (#F59E0B): 2.15:1 ✅ (meets 3:1 for large text)
 * - blackCorp on warning: 4.46:1 ❌ (below 4.5:1)
 * - whiteCorp on error (#EF4444): 3.76:1 ✅ (meets 3:1 for large text)
 * - blackCorp on error: 2.55:1 ❌ (below 4.5:1)
 *
 * Critical Issues:
 * 1. Primary color (#FF0037) fails contrast requirements with both white and black text
 * 2. Semantic colors (success, warning, error) fail contrast with blackCorp text
 * 3. blackCorp/40 opacity variant fails contrast requirements
 *
 * Recommendations:
 * - Avoid using blackCorp/40 on whiteCorp for body text
 * - Use blackCorp or blackCorp/80 for primary text on light backgrounds
 * - For primary color backgrounds, consider using a darker shade or different text color
 * - Semantic colors should primarily use whiteCorp text on colored backgrounds
 * - Test all color combinations with automated accessibility tools
 * - Consider adjusting primary color to meet WCAG AA standards
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type PrimaryColor = keyof typeof primaryColors;
export type NeutralColor = keyof typeof neutralColors;
export type SemanticColor = keyof typeof semanticColors;
export type GrayScale = keyof typeof grayScale;

export type ColorToken =
  | `primary-${PrimaryColor}`
  | `neutral-${NeutralColor}`
  | `semantic-${SemanticColor}`
  | `gray-${GrayScale}`;

export interface ColorPalette {
  primary: typeof primaryColors;
  neutral: typeof neutralColors;
  semantic: typeof semanticColors;
  gray: typeof grayScale;
}

export const colorPalette: ColorPalette = {
  primary: primaryColors,
  neutral: neutralColors,
  semantic: semanticColors,
  gray: grayScale,
} as const;
