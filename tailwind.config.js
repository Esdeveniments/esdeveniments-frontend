/** @type {import('tailwindcss').Config} */

module.exports = {
  mode: "jit",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./types/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [],
  theme: {
    extend: {
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.25" }], // 12px
        sm: ["0.875rem", { lineHeight: "1.4" }], // 14px
        base: ["1rem", { lineHeight: "1.5" }], // 16px (accessible default)
        lg: ["1.125rem", { lineHeight: "1.6" }], // ~18px
        xl: ["1.25rem", { lineHeight: "1.6" }], // ~20px
        "2xl": ["1.5rem", { lineHeight: "1.6" }], // ~24px
        "3xl": ["1.875rem", { lineHeight: "1.4" }], // 30px
        "4xl": ["2.25rem", { lineHeight: "1.25" }], // 36px
        "5xl": ["3rem", { lineHeight: "1.15" }], // 48px
        // Semantic typography tokens
        "heading-1": ["2.25rem", { lineHeight: "2.5rem", fontWeight: "700" }],
        "heading-2": ["1.875rem", { lineHeight: "2.25rem", fontWeight: "600" }],
        "heading-3": ["1.5rem", { lineHeight: "2rem", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.75rem" }],
        "body-md": ["1rem", { lineHeight: "1.5rem" }],
        "body-sm": ["0.875rem", { lineHeight: "1.25rem" }],
        caption: ["0.75rem", { lineHeight: "1rem" }],
      },
      fontFamily: {
        roboto: ["var(--font-roboto-flex)", "sans-serif"],
        barlow: ["var(--font-barlow-condensed)", "sans-serif"],
      },
      letterSpacing: {
        tight: "-0.025em",
        normal: "0em",
        wide: "0.025em",
        wider: "0.05em",
      },
      spacing: {
        "component-xs": "0.5rem", // 8px - small gaps, borders
        "component-sm": "0.75rem", // 12px - buttons, inputs
        "component-md": "1rem", // 16px - cards, sections
        "component-lg": "1.5rem", // 24px - containers
        "component-xl": "2rem", // 32px - large spaces
        "component-2xl": "3rem", // 48px - hero sections
        // Padding específic per components
        "card-padding": "1.5rem",
        "button-x": "1rem",
        "button-y": "0.5rem",
        "input-x": "0.75rem",
        "input-y": "0.5rem",
        // Page layout spacing
        "page-x": "1rem",
        "page-y": "2rem",
        // Page top margins
        "page-top": "2rem", // 32px - standard page top margin
        "page-top-large": "4rem", // 64px - large page top margin
        // Section spacing
        "section-x": "1.5rem",
        "section-y": "3rem",
        "section-gap": "1.5rem", // Standard gap between sections
        // Container padding
        "container-x": "1rem",
        "container-x-lg": "1.5rem", // Larger container padding for lg screens
        "container-y": "1.5rem",
        // Gaps
        "gap-xs": "0.25rem",
        "gap-sm": "0.5rem",
        "gap-md": "1rem",
        "gap-lg": "1.5rem",
        "gap-xl": "2rem",
        // Margins
        "margin-xs": "0.5rem",
        "margin-sm": "1rem",
        "margin-md": "1.5rem",
        "margin-lg": "2rem",
        "margin-xl": "3rem",
      },
      screens: {
        xs: "360px",
        sm: "576px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
      },
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
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
      },
      borderRadius: {
        sm: "0.125rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      borderWidth: {
        1: "1px",
        2: "2px",
        3: "3px",
        4: "4px",
      },
      transitionTimingFunction: {
        "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
        "ease-out": "cubic-bezier(0, 0, 0.2, 1)",
        "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      flex: {
        2: "2 2 0%",
        3: "3 3 0%",
        4: "4 4 0%",
      },
      zIndex: {
        1: "1",
        900: "900",
      },
    },
    colors: {
      primary: "#FF0037",
      primarydark: "#C8033F",
      primarySoft: "#FF003750",
      whiteCorp: "#ffffff",
      darkCorp: "#F7F7F7",
      // Use RGB with <alpha-value> to support /opacity utilities like from-blackCorp/70
      blackCorp: "rgb(69 69 69 / <alpha-value>)",
      fullBlackCorp: "rgb(0 0 0 / <alpha-value>)",
      bColor: "#cccccc",
      // Semantic colors
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      // Extended gray scale
      gray: {
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
      },
      // Secondary color
      secondary: "#6B7280",
      // Interactive states
      "primary-hover": "#C8033F",
      "primary-focus": "#FF0037AA",
      "primary-active": "#A8033F",
      "primary-disabled": "#cccccc",
    },
  },
  variants: {
    extend: {
      opacity: ["disabled"],
      cursor: ["disabled"],
    },
  },
  plugins: [
    require("@tailwindcss/aspect-ratio"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
  ],
};
