import type { Config } from "tailwindcss";
import aspectRatio from "@tailwindcss/aspect-ratio";
import typography from "@tailwindcss/typography";
import forms from "@tailwindcss/forms";

const config: Config = {
  purge: ["./components/**/*.{js,ts,jsx,tsx}", "./pages/**/*.{js,ts,jsx,tsx}"],
  content: [
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        roboto: ["Roboto Flex", "sans-serif"],
        barlow: ["Barlow Condensed", "sans-serif"],
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
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        appear: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        disappear: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      boxShadow: {
        lg: "4px 4px 9px -3px #45454590",
      },
      flex: {
        "2": "2 2 0%",
        "3": "3 3 0%",
        "4": "4 4 0%",
      },
      zIndex: {
        "1": "1",
        "900": "900",
      },
    },
    colors: {
      primary: "#FF0037",
      primarydark: "#C8033F",
      primarySoft: "#FF003750",
      whiteCorp: "#ffffff",
      darkCorp: "#F7F7F7",
      blackCorp: "#454545",
      bColor: "#cccccc",
    },
  },
  variants: {
    extend: {
      opacity: ["disabled"],
      cursor: ["disabled"],
    },
  },
  plugins: [aspectRatio, typography, forms],
};

export default config;
