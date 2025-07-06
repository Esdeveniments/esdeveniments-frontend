import "../styles/critical.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import GoogleScripts from "./GoogleScripts";
import { BaseLayout } from "@components/ui/layout";
import WebsiteSchema from "@components/partials/WebsiteSchema";
import CriticalCSS from "@components/partials/CriticalCSS";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const barlow = Inter({ subsets: ["latin"], variable: "--font-barlow" });

export const metadata: Metadata = {
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ca" className={inter.variable + " " + barlow.variable}>
      <head>
        {/* Preload critical fonts */}
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

        {/* Critical Resource Hints - Performance Boost */}
        {/* Google Services - High Priority */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link
          rel="preconnect"
          href="https://fundingchoicesmessages.google.com"
        />
        <link rel="preconnect" href="https://www.google.com" />

        {/* DNS Prefetch for Social Media - Lower Priority */}
        <link rel="dns-prefetch" href="//www.facebook.com" />
        <link rel="dns-prefetch" href="//twitter.com" />
        <link rel="dns-prefetch" href="//www.instagram.com" />
        <link rel="dns-prefetch" href="//t.me" />
        <link rel="dns-prefetch" href="//wa.me" />
        <link rel="dns-prefetch" href="//www.linkedin.com" />

        {/* Other External Resources */}
        <link rel="dns-prefetch" href="//schema.org" />
        <link rel="dns-prefetch" href="//outlook.live.com" />

        {/* RSS Feed */}
        <link
          rel="alternate"
          title="RSS Feed Esdeveniments.cat"
          type="application/rss+xml"
          href="/rss.xml"
        />
      </head>
      <body>
        <GoogleScripts />
        <WebsiteSchema />
        <CriticalCSS />
        <BaseLayout>{children}</BaseLayout>
      </body>
    </html>
  );
}
