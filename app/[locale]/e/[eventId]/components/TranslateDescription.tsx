"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { sanitizeHtmlClient } from "@utils/sanitize";
import { captureException } from "@sentry/nextjs";
import { translateDescription } from "../actions";
import { processDescription } from "@utils/text-processing";
import { isNonDefaultLocale } from "@utils/i18n-routing";
import type { AppLocale } from "types/i18n";
import Button from "@components/ui/common/button";

export default function TranslateDescription({
  slug,
  locale,
  targetId = "event-description-body",
}: {
  slug: string;
  locale?: AppLocale;
  targetId?: string;
}) {
  const t = useTranslations("Components.Description");
  const [isPending, startTransition] = useTransition();
  const [translationHtml, setTranslationHtml] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const originalHtmlRef = useRef<string | null>(null);
  const targetLang = isNonDefaultLocale(locale) ? locale : null;

  if (!targetLang) {
    // Component only shows on non-default locales when description is in Catalan
    return null;
  }

  const targetLabel = t.has(`target.${targetLang}`)
    ? t(`target.${targetLang}`)
    : targetLang.toUpperCase();

  // Search our own section: Next keeps recently visited pages mounted but
  // hidden, so a document-wide lookup by id can hit another event.
  const getTarget = () =>
    rootRef.current?.closest("section")?.querySelector<HTMLElement>(`#${targetId}`) ?? null;

  const swapHtmlWithFade = (el: HTMLElement, nextHtml: string) => {
    // Add transition classes once (cheap, idempotent)
    el.classList.add("transition-opacity", "duration-300", "ease-in-out");

    // Fade out → replace → fade in
    el.style.opacity = "0";
    window.setTimeout(() => {
      el.innerHTML = nextHtml;
      el.style.opacity = "1";
    }, 120);
  };

  const handleTranslate = () => {
    setErrorMessage(null);
    // Taken before the request, so the answer lands where it was asked for.
    const el = getTarget();
    if (!el) return;
    // The original isn't sent as a prop: the server already rendered it here.
    originalHtmlRef.current ??= el.innerHTML;
    startTransition(async () => {
      try {
        // If we already have a translation, just toggle in-place
        if (translationHtml) {
          const next = !showTranslated;
          setShowTranslated(next);
          swapHtmlWithFade(el, next ? translationHtml : (originalHtmlRef.current ?? ""));
          return;
        }

        const result = await translateDescription({ slug, targetLang });

        if (result?.ok && result.translation) {
          const processed = processDescription(result.translation);
          const sanitized = sanitizeHtmlClient(processed);
          setTranslationHtml(sanitized);
          setShowTranslated(true);
          swapHtmlWithFade(el, sanitized);
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
    <div ref={rootRef} className="space-y-1">
      <Button
        variant="ghost"
        onClick={handleTranslate}
        disabled={isPending}
        className="btn-sm w-fit normal-case tracking-normal font-normal whitespace-nowrap"
      >
        {isPending
          ? t("translating")
          : showTranslated && translationHtml
            ? t("showOriginal")
            : t("translateCta", { target: targetLabel })}
      </Button>

      {errorMessage && (
        <p className="body-normal text-foreground/80">{errorMessage}</p>
      )}
    </div>
  );
}




