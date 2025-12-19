"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("App.Error");
  useEffect(() => {
    if (error) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <h1 className="heading-2">{t("title")}</h1>
      <p>{error?.message || t("retry")}</p>
      <button onClick={reset} style={{ marginTop: 16 }}>
        {t("reload")}
      </button>
    </div>
  );
}
