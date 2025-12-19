import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import type { Metadata } from "next";

import type { AppLocale } from "types/i18n";
import { ensureLocale } from "@utils/i18n-routing";
import { BaseLayout } from "@components/ui/layout";
import { AdProvider } from "@lib/context/AdContext";
import WebsiteSchema from "@components/partials/WebsiteSchema";
import GoogleScripts from "../GoogleScripts";

export async function generateMetadata({
  params,
}: {
  params: { locale?: string };
}): Promise<Metadata> {
  const { locale } = params;
  const resolvedLocale = ensureLocale(locale);
  const t = await getTranslations({
    locale: resolvedLocale,
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

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale?: string };
}): Promise<ReactNode> {
  const { locale } = params;
  const resolvedLocale: AppLocale = ensureLocale(locale);

  // Distribute the locale to all server components in this request.
  setRequestLocale(resolvedLocale);

  // Pass an explicit locale to avoid next-intl needing to resolve requestLocale
  // (request-bound) at the RootLayout level under `experimental.cacheComponents`.
  const messages = await getMessages({ locale: resolvedLocale });

  return (
    <NextIntlClientProvider key={resolvedLocale} messages={messages} locale={resolvedLocale}>
      <AdProvider>
        <WebsiteSchema locale={resolvedLocale} />
        <GoogleScripts />
        <BaseLayout>{children}</BaseLayout>
      </AdProvider>
    </NextIntlClientProvider>
  );
}
