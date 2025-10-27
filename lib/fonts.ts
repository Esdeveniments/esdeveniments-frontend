// lib/fonts.ts
import localFont from "next/font/local";

export const robotoFlex = localFont({
  src: [
    {
      path: "../public/static/fonts/RobotoFlex-Regular.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-roboto-flex",
  display: "swap",
  fallback: ["system-ui", "Arial"],
  adjustFontFallback: "Arial",
});

export const barlowCondensed = localFont({
  src: [
    {
      path: "../public/static/fonts/BarlowCondensed-Regular.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
  fallback: ["system-ui", "Arial"],
  adjustFontFallback: "Arial",
});
