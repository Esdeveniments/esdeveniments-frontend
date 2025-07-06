import "../styles/critical.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import GoogleScripts from "./GoogleScripts";
import { BaseLayout } from "@components/ui/layout";
import WebsiteSchema from "@components/partials/WebsiteSchema";
import CriticalCSS from "@components/partials/CriticalCSS";

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
    <html lang="ca">
      <body>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link
          rel="preload"
          href="/static/fonts/RobotoFlex-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/static/fonts/BarlowCondensed-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <WebsiteSchema />
        <CriticalCSS />
        <GoogleScripts />
        <BaseLayout>{children}</BaseLayout>
      </body>
    </html>
  );
}
