/** @type {import('tailwindcss').Config} */

const foregroundRgb = "69 69 69";

module.exports = {
  content: ["./components/**/*.{js,ts,jsx,tsx}", "./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "0.5rem", // px-2
        lg: "0rem", // lg:px-0
      },
      screens: {
        sm: "580px",
        md: "768px",
        lg: "1024px",
      },
    },
    extend: {
      // === TYPOGRAPHY === //
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.25" }], // 12px
        sm: ["0.875rem", { lineHeight: "1.4" }], // 14px
        base: ["1rem", { lineHeight: "1.5" }], // 16px
        lg: ["1.125rem", { lineHeight: "1.6" }], // 18px
        xl: ["1.25rem", { lineHeight: "1.6" }], // 20px
        "2xl": ["1.5rem", { lineHeight: "1.6" }], // 24px
        "3xl": ["1.875rem", { lineHeight: "1.4" }], // 30px
        "4xl": ["2.25rem", { lineHeight: "1.25" }], // 36px
        "4.5xl": ["2.625rem", { lineHeight: "1.2" }], // 42px (NEW - hero subtitles)
        "5xl": ["3rem", { lineHeight: "1.15" }], // 48px
      },
      fontFamily: {
        roboto: ["var(--font-roboto-flex)", "sans-serif"],
        barlow: ["var(--font-barlow-condensed)", "sans-serif"],
      },

      // === SCREENS === //
      screens: {
        xs: "360px",
        sm: "576px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
      },

      // === COLORS === //
      colors: {
        // Brand colors
        primary: "#FF0037",
        "primary-dark": "#C8033F",
        "primary-soft": "#FF003750",

        // Semantic tokens (canonical)
        background: "#ffffff",
        foreground: `rgb(${foregroundRgb} / <alpha-value>)`,
        "foreground-strong": "rgb(0 0 0 / <alpha-value>)",
        muted: "#F7F7F7",
        border: "#CCCCCC",
        "primary-foreground": "#ffffff",
        "error-foreground": "#ffffff",

        // Tailwind default neutrals (reference-only)
        // Note: gray-* and white exist in Tailwind, but are NOT canonical here.
        // Avoid using them directly; prefer the semantic tokens above.

        // Semantic colors (NEW)
        success: "#10B981",
        "success-dark": "#059669",
        error: "#EF4444",
        "error-dark": "#DC2626",
        warning: "#F59E0B",
        "warning-dark": "#D97706",
        info: "#3B82F6",
        "info-dark": "#2563EB",
      },

      // === SPACING === //
      spacing: {
        // Section spacing
        "section-y": "3rem", // 48px - Vertical section spacing
        "section-x": "1rem", // 16px - Horizontal section padding

        // Card spacing
        "card-padding": "1.5rem", // 24px - Card padding (desktop)
        "card-padding-sm": "1rem", // 16px - Card padding (mobile)

        // Element gaps
        "element-gap": "0.75rem", // 12px - Default gap
        "element-gap-sm": "0.5rem", // 8px - Small gap

        // Button/Input spacing
        "button-x": "1rem", // 16px - Button horizontal padding
        "button-y": "0.5rem", // 8px - Button vertical padding
        "input-x": "0.75rem", // 12px - Input horizontal padding
        "input-y": "0.5rem", // 8px - Input vertical padding

        // Badge spacing
        "badge-x": "0.75rem", // 12px - Badge horizontal padding
        "badge-y": "0.25rem", // 4px - Badge vertical padding
      },

      // === BORDER RADIUS === //
      borderRadius: {
        button: "0.5rem", // 8px - Buttons, small elements
        card: "0.75rem", // 12px - Cards, containers
        input: "0.5rem", // 8px - Form inputs
        badge: "9999px", // Full - Pills, badges
        modal: "1rem", // 16px - Modals, dialogs
      },

      // === SHADOWS (PROFESSIONAL SYSTEM) === //
      boxShadow: {
        none: "none",
        xs: `0 1px 2px 0 rgba(${foregroundRgb}, 0.05)`,
        sm: `0 1px 3px 0 rgba(${foregroundRgb}, 0.1), 0 1px 2px -1px rgba(${foregroundRgb}, 0.06)`,
        DEFAULT: `0 4px 6px -1px rgba(${foregroundRgb}, 0.1), 0 2px 4px -2px rgba(${foregroundRgb}, 0.06)`,
        md: `0 6px 16px -4px rgba(${foregroundRgb}, 0.12), 0 4px 8px -2px rgba(${foregroundRgb}, 0.08)`,
        lg: `0 12px 24px -6px rgba(${foregroundRgb}, 0.15), 0 6px 12px -3px rgba(${foregroundRgb}, 0.1)`,
        xl: `0 20px 32px -8px rgba(${foregroundRgb}, 0.18), 0 8px 16px -4px rgba(${foregroundRgb}, 0.12)`,
        focus: "0 0 0 3px rgba(255, 0, 55, 0.2)",
        "focus-error": "0 0 0 3px rgba(239, 68, 68, 0.2)",
      },

      // === TRANSITIONS === //
      transitionDuration: {
        fast: "100ms", // Instant feedback
        normal: "200ms", // Standard transitions
        slow: "300ms", // Smooth, noticeable
        slower: "500ms", // Modals, page transitions
      },
      transitionTimingFunction: {
        "bounce-subtle": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        "ease-out-back": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      // === ANIMATIONS === //
      animation: {
        "fast-pulse": "fast-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fast-pulse1": "fast-pulse 300ms cubic-bezier(0.4, 0, 0.6, 1) 100ms",
        appear: "appear 500ms",
        disappear: "disappear 500ms",
      },
      keyframes: {
        "fast-pulse": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0 },
        },
        appear: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        disappear: {
          "0%": { opacity: 1 },
          "100%": { opacity: 0 },
        },
      },

      // === MISC === //
      flex: {
        2: "2 2 0%",
        3: "3 3 0%",
        4: "4 4 0%",
      },
      zIndex: {
        1: "1",
        10: "10", // sticky nav
        100: "100", // dropdowns, popovers
        900: "900", // modals
        1000: "1000", // tooltips
      },
    },
  },
  plugins: [
    require("@tailwindcss/aspect-ratio"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
  ],
};
