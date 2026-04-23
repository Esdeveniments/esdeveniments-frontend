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
    <div className="flex-1 flex-center flex-col py-section-y px-section-x text-center">
      <h1 className="heading-2">{t("title")}</h1>
      <p>{error?.message || t("retry")}</p>
      <button onClick={reset} className="mt-4 btn-primary">
        {t("reload")}
      </button>
    </div>
  );
}
