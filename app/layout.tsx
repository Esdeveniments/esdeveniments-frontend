import "../styles/globals.css";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import type { Metadata, Viewport } from "next";
import GoogleScripts from "./GoogleScripts";
import { AdProvider } from "../lib/context/AdContext";
import { BaseLayout } from "@components/ui/layout";
import WebsiteSchema from "@components/partials/WebsiteSchema";
// Removed custom fonts - now using system font stack
// import { robotoFlex, barlowCondensed } from "../lib/fonts";
import { getApiOrigin } from "../utils/api-helpers";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "types/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Components.Layout");

  return {
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "default",
    },
    alternates: {
      types: {
        "application/rss+xml": [
          { url: "/rss.xml", title: t("rss") },
          { url: "/noticies/rss.xml", title: t("rssNews") },
        ],
      },
    },
  };
}

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
  const locale = (await getLocale()) as AppLocale;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        {apiOrigin && (
          <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />
        )}
      </head>
      <body>
        <NextIntlClientProvider
          key={locale}
          messages={messages}
          locale={locale}
        >
          <AdProvider>
            <WebsiteSchema locale={locale} />
            <GoogleScripts />
            <BaseLayout>{children}</BaseLayout>
          </AdProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
