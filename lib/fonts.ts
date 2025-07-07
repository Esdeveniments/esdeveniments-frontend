import localFont from "next/font/local";

export const robotoFlex = localFont({
  src: [
    {
      path: "../public/static/fonts/RobotoFlex-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-roboto-flex",
  display: "swap",
});

export const barlowCondensed = localFont({
  src: [
    {
      path: "../public/static/fonts/BarlowCondensed-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
});
