import "../styles/globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import GoogleScripts from "./GoogleScripts";
import { BaseLayout } from "@components/ui/layout";
import WebsiteSchema from "@components/partials/WebsiteSchema";
// Removed custom fonts - now using system font stack
// import { robotoFlex, barlowCondensed } from "../lib/fonts";
import { getApiOrigin } from "../utils/api-helpers";

export const metadata: Metadata = {
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
  alternates: {
    types: {
      "application/rss+xml": [
        { url: "/rss.xml", title: "RSS" },
        { url: "/noticies/rss.xml", title: "RSS Notícies" },
      ],
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const apiOrigin = getApiOrigin();

  return (
    <html lang="ca">
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        {apiOrigin && (
          <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />
        )}
      </head>
      <body>
        <WebsiteSchema />
        <GoogleScripts />
        <BaseLayout>{children}</BaseLayout>
      </body>
    </html>
  );
}
