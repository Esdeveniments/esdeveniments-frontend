"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { ArrowLeftIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Button from "@components/ui/common/button";
import { sendGoogleEvent, ensureGtag } from "@utils/analytics";
import type { PromoteEventClientProps } from "types/props";
import type { PromotionOptionDTO } from "types/api/promotion";
import { createPromotionCheckoutAction } from "./actions";

export default function PromoteEventClient({
  eventId,
  slug,
  options,
  pendingCheckoutUrl,
}: PromoteEventClientProps) {
  const t = useTranslations("App.EventPromote");
  const locale = useLocale();
  const catalog = options.ok ? options.data.options : [];
  const canPurchase = options.ok && options.data.canPurchase;
  const unavailableCode = options.ok
    ? (options.data.unavailableReason ?? "NO_AVAILABLE_OPTIONS")
    : options.code;
  const [selectedId, setSelectedId] = useState<string | null>(
    () => catalog.find((option) => option.available)?.id ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  // One Idempotency-Key per option, stable across retries of that purchase.
  const idempotencyKeys = useRef(new Map<string, string>());

  const hasTrackedPageViewRef = useRef(false);
  useEffect(() => {
    if (hasTrackedPageViewRef.current) return;
    ensureGtag();
    sendGoogleEvent("promote_page_view", { event_slug: slug });
    hasTrackedPageViewRef.current = true;
  }, [slug]);

  const describeCode = (code: string) => {
    const key = `errors.${code}`;
    return t.has(key as never) ? t(key as never) : t("errorGeneric");
  };

  const formatPrice = (option: PromotionOptionDTO) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: option.currency,
    }).format(option.amountMinor / 100);

  const handleConfirm = async () => {
    if (!selectedId) return;
    let idempotencyKey = idempotencyKeys.current.get(selectedId);
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      idempotencyKeys.current.set(selectedId, idempotencyKey);
    }

    setErrorCode(null);
    setIsSubmitting(true);
    sendGoogleEvent("promote_checkout_click", {
      event_slug: slug,
      option_id: selectedId,
    });

    try {
      const result = await createPromotionCheckoutAction(
        eventId,
        selectedId,
        idempotencyKey,
      );
      if (!result.ok) {
        sendGoogleEvent("promote_checkout_error", {
          event_slug: slug,
          reason: result.code,
        });
        setErrorCode(result.code);
        setIsSubmitting(false);
        return;
      }
      sendGoogleEvent("promote_checkout_redirect", { event_slug: slug });
      window.location.assign(result.data.url);
    } catch (error) {
      console.error("PromoteEventClient: checkout action rejected", error);
      sendGoogleEvent("promote_checkout_error", {
        event_slug: slug,
        reason: "unexpected-rejection",
      });
      setErrorCode("UNKNOWN");
      setIsSubmitting(false);
    }
  };

  return (
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
            {(["benefit1", "benefit2", "benefit3"] as const).map((key) => (
              <li key={key} className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        {pendingCheckoutUrl && (
          <div className="card-bordered card-body flex flex-col gap-3">
            <p className="body-normal text-foreground/80">
              {t("pendingCheckout")}
            </p>
            <a
              href={pendingCheckoutUrl}
              className="btn-outline w-full min-h-[44px] justify-center"
              data-testid="promote-resume-checkout"
            >
              {t("resumeCheckout")}
            </a>
          </div>
        )}

        {canPurchase ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="body-normal font-semibold text-foreground-strong mb-2">
              {t("chooseOption")}
            </legend>
            {catalog.map((option) => (
              <label
                key={option.id}
                className={`card-bordered card-body flex items-center gap-3 ${
                  option.available
                    ? "cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                } ${selectedId === option.id ? "border-primary" : ""}`}
              >
                <input
                  type="radio"
                  name="promotion-option"
                  value={option.id}
                  checked={selectedId === option.id}
                  disabled={!option.available || isSubmitting}
                  onChange={() => setSelectedId(option.id)}
                />
                <span className="flex-1 flex flex-col">
                  <span className="body-normal text-foreground-strong">
                    {t(`scope.${option.scope}`)} ·{" "}
                    {t("duration", { days: option.durationDays })}
                  </span>
                  {!option.available && option.unavailableReason && (
                    <span className="body-small text-foreground/60">
                      {describeCode(option.unavailableReason)}
                    </span>
                  )}
                </span>
                <span className="heading-3 text-foreground-strong">
                  {formatPrice(option)}
                </span>
              </label>
            ))}
            {catalog.every((option) => option.taxIncluded) && (
              <p className="body-small text-foreground/60">{t("taxIncluded")}</p>
            )}
          </fieldset>
        ) : (
          <div
            className="w-full px-4 py-3 bg-muted rounded-lg"
            role="status"
            data-testid="promote-unavailable"
          >
            <p className="body-normal text-foreground/80">
              {describeCode(unavailableCode)}
            </p>
          </div>
        )}

        {errorCode && (
          <div
            className="w-full px-4 py-3 bg-error/10 border border-error rounded-lg"
            role="alert"
          >
            <p className="text-sm font-medium text-error">
              {describeCode(errorCode)}
            </p>
          </div>
        )}

        {canPurchase && (
          <Button
            type="button"
            variant="primary"
            className="w-full min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || !selectedId}
            data-testid="promote-confirm-button"
            onClick={handleConfirm}
          >
            {isSubmitting ? t("confirmButtonLoading") : t("confirmButton")}
          </Button>
        )}
      </div>
    </div>
  );
}
