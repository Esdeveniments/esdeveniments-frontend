/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./components/**/*.{js,ts,jsx,tsx}", "./app/**/*.{js,ts,jsx,tsx}"],
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
      },
      fontFamily: {
        roboto: ["var(--font-roboto-flex)", "sans-serif"],
        barlow: ["var(--font-barlow-condensed)", "sans-serif"],
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
        lg: "4px 4px 9px -3px #45454590",
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
