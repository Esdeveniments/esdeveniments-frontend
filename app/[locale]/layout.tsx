import "../../styles/globals.css";
import { Suspense, type ReactNode } from "react";
import { locale as rootLocale } from "next/root-params";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import {
  getMessages,
  setRequestLocale,
  getTranslations,
} from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { routing } from "@i18n/routing";
import GoogleScripts from "../GoogleScripts";
import { AdProvider } from "@lib/context/AdContext";
import { DevAuthProvider } from "@lib/auth/DevAuthProvider";
import { BaseLayout } from "@components/ui/layout";
import WebsiteSchema from "@components/partials/WebsiteSchema";
import AnalyticsBootstrap from "@components/partials/AnalyticsBootstrap";
import WebMcpTools from "@components/partials/WebMcpTools";
import type { AppLocale } from "types/i18n";
import {
  CLIENT_APP_KEYS,
  CLIENT_COMPONENT_KEYS,
  CLIENT_UTILS_KEYS,
  CLIENT_FULL_TOP_LEVEL,
} from "@lib/i18n/client-namespaces";

function pickNamespace<T extends Record<string, unknown>>(
  source: T | undefined,
  keys: readonly string[],
): Partial<T> {
  if (!source) return {};
  const out: Partial<T> = {};
  for (const key of keys) {
    if (key in source) {
      (out as Record<string, unknown>)[key] = source[key];
    }
  }
  return out;
}

function pickClientMessages(
  messages: Awaited<ReturnType<typeof getMessages>>,
): Partial<typeof messages> {
  const m = messages as Record<string, Record<string, unknown> | undefined>;
  const picked: Record<string, unknown> = {
    App: pickNamespace(m.App, CLIENT_APP_KEYS),
    Components: pickNamespace(m.Components, CLIENT_COMPONENT_KEYS),
    Utils: pickNamespace(m.Utils, CLIENT_UTILS_KEYS),
  };
  for (const key of CLIENT_FULL_TOP_LEVEL) {
    if (m[key] !== undefined) picked[key] = m[key];
  }
  return picked as Partial<typeof messages>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootLocale()) as AppLocale;
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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = (await rootLocale()) as AppLocale;

  // Validate that the incoming locale is supported
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Distribute the locale to all server components in this request
  setRequestLocale(locale);

  const messages = await getMessages();
  const clientMessages = pickClientMessages(messages);

  return (
    <html lang={locale}>
      <head>
        {/* Google Fonts: preconnect to both CSS origin and font files origin */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Analytics/ads load lazily - use dns-prefetch instead of preconnect */}
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//stats.g.doubleclick.net" />
        <link rel="dns-prefetch" href="//pagead2.googlesyndication.com" />
        {/* MCP server discovery for AI agents (WebMCP + Streamable HTTP) */}
        <link rel="mcp-server-sse" href="/.well-known/mcp" />
      </head>
      <body>
        <Script
          id="sw-register"
          strategy="lazyOnload"
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
          messages={clientMessages}
          locale={locale}
        >
          <Suspense fallback={null}>
            <AdProvider>
              <DevAuthProvider>
                <WebsiteSchema locale={locale} />
                <Suspense fallback={null}>
                  <GoogleScripts />
                </Suspense>
                <AnalyticsBootstrap />
                <WebMcpTools locale={locale} />
                <BaseLayout>{children}</BaseLayout>
              </DevAuthProvider>
            </AdProvider>
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
