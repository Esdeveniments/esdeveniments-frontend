import "../styles/critical.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import GoogleScripts from "./GoogleScripts";
import { BaseLayout } from "@components/ui/layout";
import WebsiteSchema from "@components/partials/WebsiteSchema";
import CriticalCSS from "@components/partials/CriticalCSS";
import { robotoFlex, barlowCondensed } from "../lib/fonts";

export const metadata: Metadata = {
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/rss.xml", title: "RSS" }],
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ca"
      className={`${robotoFlex.variable} ${barlowCondensed.variable}`}
    >
      <body>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <WebsiteSchema />
        <CriticalCSS />
        <GoogleScripts />
        <BaseLayout>{children}</BaseLayout>
      </body>
    </html>
  );
}
