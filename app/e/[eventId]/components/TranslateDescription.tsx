"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { sanitizeHtmlClient } from "@utils/sanitize";
import { captureException } from "@sentry/nextjs";
import { translateDescription } from "../actions";
import { processDescription } from "@utils/text-processing";
import type { AppLocale } from "types/i18n";

export default function TranslateDescription({
  description,
  locale,
  targetId = "event-description-body",
}: {
  description: string;
  locale?: AppLocale;
  targetId?: string;
}) {
  const t = useTranslations("Components.Description");
  const [isPending, startTransition] = useTransition();
  const [translationHtml, setTranslationHtml] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);

  const targetLang = locale === "es" ? "es" : locale === "en" ? "en" : null;
  const originalHtml = useMemo(() => {
    const processed = processDescription(description || "");
    return sanitizeHtmlClient(processed);
  }, [description]);

  if (!targetLang) {
    // Component only shows for Spanish or English locales (description is in Catalan)
    return null;
  }

  const targetLabel = targetLang === "en" ? t("target.en") : t("target.es");

  const swapHtmlWithFade = (nextHtml: string) => {
    const el = typeof document !== "undefined" ? document.getElementById(targetId) : null;
    if (!el) return;

    // Add transition classes once (cheap, idempotent)
    el.classList.add("transition-opacity", "duration-300", "ease-in-out");

    // Fade out → replace → fade in
    (el as HTMLElement).style.opacity = "0";
    window.setTimeout(() => {
      el.innerHTML = nextHtml;
      (el as HTMLElement).style.opacity = "1";
    }, 120);
  };

  const handleTranslate = () => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        // If we already have a translation, just toggle in-place
        if (translationHtml) {
          setShowTranslated((prev) => {
            const next = !prev;
            swapHtmlWithFade(next ? translationHtml : originalHtml);
            return next;
          });
          return;
        }

        const result = await translateDescription({
          text: description,
          targetLang,
        });

        if (result?.ok && result.translation) {
          const processed = processDescription(result.translation);
          const sanitized = sanitizeHtmlClient(processed);
          setTranslationHtml(sanitized);
          setShowTranslated(true);
          swapHtmlWithFade(sanitized);
          return;
        }

        setTranslationHtml(null);

        // Show more specific error message if available
        if (result?.error === "missing-key") {
          setErrorMessage(t("translateError") + " (API key missing)");
        } else if (result?.error === "empty") {
          setErrorMessage(t("translateError") + " (empty description)");
        } else if (result?.error === "request-failed") {
          setErrorMessage(t("translateError") + " (API request failed)");
        } else {
          setErrorMessage(t("translateError"));
        }
      } catch (error) {
        console.error("Translation error:", error);

        if (process.env.NODE_ENV === "production") {
          captureException(error, {
            tags: { feature: "translate-description", error_type: "client-error" },
            extra: { targetLang },
          });
        }

        setTranslationHtml(null);
        setErrorMessage(t("translateError") + " (unexpected error)");
      }
    });
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="btn-neutral w-fit text-sm whitespace-nowrap"
        onClick={handleTranslate}
        disabled={isPending}
      >
        {isPending
          ? t("translating")
          : showTranslated && translationHtml
            ? t("showOriginal")
            : t("translateCta", { target: targetLabel })}
      </button>

      {errorMessage && (
        <p className="body-normal text-foreground/80">{errorMessage}</p>
      )}
    </div>
  );
}




