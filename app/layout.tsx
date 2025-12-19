import "../styles/globals.css";

import type { ReactNode } from "react";
import type { Viewport } from "next";
import { headers } from "next/headers";
import { getApiOrigin } from "@utils/api-helpers";
import { ensureLocale } from "@utils/i18n-routing";

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
  const requestHeaders = await headers();
  const requestLocale = ensureLocale(requestHeaders.get("x-next-intl-locale") || undefined);

  return (
    <html lang={requestLocale}>
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        {apiOrigin && (
          <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />
        )}
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
