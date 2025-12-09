"use client";

import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import caMessages from "../messages/ca.json";
import "../styles/globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  const locale = "ca";

  return (
    <html lang={locale}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <NextIntlClientProvider
          messages={caMessages as unknown as AbstractIntlMessages}
          locale={locale}
        >
          <GlobalErrorContent error={error} reset={reset} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

function GlobalErrorContent({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("App.GlobalError");
  const fallbackMessage = t("retry");

  return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <h1 className="heading-2">{t("title")}</h1>
      <p>
        {process.env.NODE_ENV === "development"
          ? error?.message || fallbackMessage
          : fallbackMessage}
      </p>
      <button onClick={reset} style={{ marginTop: 16 }}>
        {t("reload")}
      </button>
    </div>
  );
}
