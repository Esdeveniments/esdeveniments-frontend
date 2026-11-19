"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { captureException } from "@sentry/nextjs";
import { translateDescription } from "../actions";
import Button from "@components/ui/common/button";
import DescriptionLayout, {
  DESCRIPTION_BODY_CLASS,
} from "@components/ui/common/description/DescriptionLayout";
import type { DescriptionTranslation, TranslateDescriptionProps } from "types/props";

const ERROR_DETAILS: Record<string, string> = {
  "missing-key": " (API key missing)",
  empty: " (empty description)",
  "request-failed": " (API request failed)",
};

/**
 * The event description with its translate button. `children` is the
 * server-rendered body; the translation (sanitized by the server action with
 * the same pipeline) is rendered in its place, so nothing writes to the DOM by
 * hand. Next keeps the previous page mounted (hidden) and each page has its own
 * state. A translation is tied to the `version` of the text it came from, so a
 * refresh with a new description, or a reply that arrives after it, shows the
 * new original.
 */
export default function TranslateDescription({
  slug,
  targetLang,
  version,
  introText,
  children,
}: TranslateDescriptionProps) {
  const t = useTranslations("Components.Description");
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<DescriptionTranslation | null>(null);
  const translation = state?.version === version ? state : null;

  const toggle = () => {
    if (translation?.html) {
      setState((prev) =>
        prev?.version === version ? { ...prev, showing: !prev.showing } : prev,
      );
      return;
    }
    startTransition(async () => {
      let next: DescriptionTranslation;
      try {
        const result = await translateDescription({ slug, targetLang, version });
        if (result.ok && result.translation) {
          next = { version, html: result.translation, showing: true, error: null };
        } else {
          const error = !result.ok && result.error === "description-changed"
            ? t("descriptionChanged")
            : t("translateError") + (result.ok ? "" : (ERROR_DETAILS[result.error] ?? ""));
          next = { version, html: null, showing: false, error };
        }
      } catch (error) {
        console.error("Translation error:", error);
        if (process.env.NODE_ENV === "production") {
          captureException(error, {
            tags: { feature: "translate-description", error_type: "client-error" },
            extra: { targetLang },
          });
        }
        next = {
          version,
          html: null,
          showing: false,
          error: t("translateError") + " (unexpected error)",
        };
      }
      startTransition(() => setState(next));
    });
  };

  return (
    <DescriptionLayout
      title={t("title")}
      introText={introText}
      actions={
        <div className="space-y-1">
          <Button
            variant="ghost"
            onClick={toggle}
            disabled={isPending}
            className="btn-sm w-fit normal-case tracking-normal font-normal whitespace-nowrap"
          >
            {isPending
              ? t("translating")
              : translation?.showing
                ? t("showOriginal")
                : t("translateCta", { target: t(`target.${targetLang}`) })}
          </Button>
          {translation?.error && (
            <p role="alert" className="body-normal text-muted-foreground">{translation.error}</p>
          )}
        </div>
      }
    >
      {translation?.html ? (
        // After the first toggle each swap remounts and fades in with CSS.
        <div
          key={translation.showing ? "translation" : "original"}
          className="animate-fade-in-fast"
        >
          {translation.showing ? (
            <div
              className={DESCRIPTION_BODY_CLASS}
              dangerouslySetInnerHTML={{ __html: translation.html }}
            />
          ) : (
            children
          )}
        </div>
      ) : (
        children
      )}
    </DescriptionLayout>
  );
}
