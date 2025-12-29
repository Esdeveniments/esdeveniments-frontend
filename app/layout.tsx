import "../styles/globals.css";
import { Suspense, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  setRequestLocale,
  getTranslations,
} from "next-intl/server";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { getLocaleSafely } from "../utils/i18n-seo";
import GoogleScripts from "./GoogleScripts";
import { AdProvider } from "../lib/context/AdContext";
import { BaseLayout } from "@components/ui/layout";
import WebsiteSchema from "@components/partials/WebsiteSchema";
import { getApiOrigin } from "../utils/api-helpers";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleSafely();
  const t = await getTranslations({
    locale,
    namespace: "Components.Layout",
  });

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
  const locale = await getLocaleSafely();

  // Distribute the locale to all server components in this request
  setRequestLocale(locale);

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
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    // When a new SW is found, tell it to skip waiting and activate immediately.
                    // This ensures users get the latest version without closing all tabs.
                    registration.addEventListener('updatefound', function() {
                      var newWorker = registration.installing;
                      if (newWorker) {
                        newWorker.addEventListener('statechange', function() {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New SW installed while old one was active - trigger skipWaiting
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                          }
                        });
                      }
                    });
                  }).catch(function() {});
                }
              } catch (_) {}
            `,
          }}
        />
        <NextIntlClientProvider
          key={locale}
          messages={messages}
          locale={locale}
        >
          <AdProvider>
            <WebsiteSchema locale={locale} />
            <Suspense fallback={null}>
              <GoogleScripts />
            </Suspense>
            <BaseLayout>{children}</BaseLayout>
          </AdProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
