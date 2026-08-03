"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { ArrowLeftIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Button from "@components/ui/common/button";
import { getEventPromotionOptions } from "@config/pricing";
import { sendGoogleEvent } from "@utils/analytics";
import type { AppLocale } from "types/i18n";
import type { PromoteEventClientProps } from "types/props";
import { createPromotionCheckoutAction } from "./actions";

function isValidCheckoutUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export default function PromoteEventClient({
  eventId,
  slug,
}: PromoteEventClientProps) {
  const t = useTranslations("App.EventPromote");
  const locale = useLocale() as AppLocale;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // MVP: exactly one option today. Rendered from a list (not a single
  // constant) so this component doesn't change shape when Gerard adds real
  // duration/geo-scope tiers later — only getEventPromotionOptions' return
  // value grows. Guarded (not a bare destructure) since a future
  // implementation of that function could legitimately return zero options
  // (e.g. no tier available for this event yet).
  const [promotionOption] = getEventPromotionOptions();

  useEffect(() => {
    sendGoogleEvent("promote_page_view", { event_slug: slug });
    // slug is stable for this component's lifetime (a new event means a full
    // remount), so this still only ever fires once despite the dependency.
  }, [slug]);

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    sendGoogleEvent("promote_checkout_click", { event_slug: slug });

    try {
      const result = await createPromotionCheckoutAction(eventId, slug, locale);

      if (!result.success) {
        sendGoogleEvent("promote_checkout_error", {
          event_slug: slug,
          reason: result.reason ?? "action-failed",
        });
        setError(
          result.reason === "stale-session"
            ? t("errorStaleSession")
            : t("errorGeneric"),
        );
        return;
      }

      if (!isValidCheckoutUrl(result.url)) {
        console.error("PromoteEventClient: invalid checkout url", result.url);
        sendGoogleEvent("promote_checkout_error", {
          event_slug: slug,
          reason: "invalid-url",
        });
        setError(t("errorGeneric"));
        return;
      }

      sendGoogleEvent("promote_checkout_redirect", { event_slug: slug });
      window.location.href = result.url;
    } catch (checkoutError) {
      console.error(
        "PromoteEventClient: checkout action rejected",
        checkoutError,
      );
      sendGoogleEvent("promote_checkout_error", {
        event_slug: slug,
        reason: "unexpected-rejection",
      });
      setError(t("errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // max-w-[520px] matches DESIGN.md's `containers.detail` token (520px) —
    // this is a single-focus confirmation flow like the event detail page,
    // not a multi-field form (which would use the wider `container` class,
    // as /publica and /edita do). Tailwind's config only customizes the
    // generic `container` utility, not a named "detail" width, so the literal
    // value is the correct concrete implementation of that design token today.
    <div className="max-w-[520px] mx-auto py-section-y px-section-x">
      <Link
        href={`/e/${slug}`}
        className="inline-flex items-center gap-1 body-small text-foreground/70 hover:text-foreground mb-4"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        {t("backToEvent")}
      </Link>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="heading-1 text-foreground-strong">{t("heading")}</h1>
          <p className="body-large text-foreground/80">{t("subheading")}</p>
        </div>

        <div className="card-bordered card-body space-y-3">
          <ul className="flex flex-col gap-2 body-normal text-foreground/80">
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
              {t("benefit1")}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
              {t("benefit2")}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
              {t("benefit3")}
            </li>
          </ul>
        </div>

        {promotionOption ? (
          <>
            <div className="card-bordered card-body flex items-center justify-between">
              <span className="body-normal text-foreground/70">
                {t("priceLabel")}
              </span>
              <span className="heading-2 text-foreground-strong">
                {promotionOption.priceEur}€
              </span>
            </div>
            <p className="body-small text-foreground/60 -mt-4">
              {t("priceNote")}
            </p>
          </>
        ) : (
          <div
            className="w-full px-4 py-3 bg-error/10 border border-error rounded-lg"
            role="alert"
          >
            <p className="text-sm font-medium text-error">
              {t("errorGeneric")}
            </p>
          </div>
        )}

        {error && (
          <div
            className="w-full px-4 py-3 bg-error/10 border border-error rounded-lg"
            role="alert"
          >
            <p className="text-sm font-medium text-error">{error}</p>
          </div>
        )}

        <Button
          type="button"
          variant="primary"
          className="w-full min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting || !promotionOption}
          data-testid="promote-confirm-button"
          onClick={handleConfirm}
        >
          {isSubmitting ? t("confirmButtonLoading") : t("confirmButton")}
        </Button>
      </div>
    </div>
  );
}
