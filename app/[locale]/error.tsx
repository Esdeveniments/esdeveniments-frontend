"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";

export default function LocaleError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("App.Error");
  useEffect(() => {
    if (error) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="flex-1 flex-center flex-col py-section-y px-section-x text-center">
      <h1 className="heading-2">{t("title")}</h1>
      <p>
        {process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message || t("retry")
          : t("retry")}
      </p>
      {/* `retry` refetches the route; `reset` would re-render the same failed payload. */}
      <button onClick={retry} className="mt-4 btn-primary">
        {t("reload")}
      </button>
    </div>
  );
}
