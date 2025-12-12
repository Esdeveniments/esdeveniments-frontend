"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import DOMPurify from "isomorphic-dompurify";
import { translateDescription } from "../actions";
import { processDescription } from "@utils/text-processing";
import type { AppLocale } from "types/i18n";

export default function TranslateDescription({
  description,
  locale,
}: {
  description: string;
  locale?: AppLocale;
}) {
  const t = useTranslations("Components.Description");
  const [isPending, startTransition] = useTransition();
  const [translationHtml, setTranslationHtml] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetLang = locale === "es" ? "es" : locale === "en" ? "en" : null;
  if (!targetLang) return null;

  const targetLabel = targetLang === "en" ? t("target.en") : t("target.es");

  const handleTranslate = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await translateDescription({
        text: description,
        targetLang,
      });

      if (result?.ok && result.translation) {
        const processed = processDescription(result.translation);
        const sanitized = DOMPurify.sanitize(processed);
        setTranslationHtml(sanitized);
        return;
      }

      setTranslationHtml(null);
      setErrorMessage(t("translateError"));
    });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-neutral w-fit"
        onClick={handleTranslate}
        disabled={isPending}
      >
        {isPending ? t("translating") : t("translateCta", { target: targetLabel })}
      </button>

      {errorMessage && (
        <p className="body-normal text-foreground/80">{errorMessage}</p>
      )}

      {translationHtml && (
        <div className="space-y-2">
          <p className="label text-foreground/80">
            {t("translatedLabel", { target: targetLabel })}
          </p>
          <div
            className="body-normal text-foreground-strong [&>*]:body-normal [&>*]:text-foreground-strong"
            dangerouslySetInnerHTML={{ __html: translationHtml }}
          />
        </div>
      )}
    </div>
  );
}




