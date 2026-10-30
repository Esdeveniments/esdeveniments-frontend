"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { ArrowLeftIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Button from "@components/ui/common/button";
import { sendGoogleEvent, ensureGtag } from "@utils/analytics";
import type { PromoteEventClientProps } from "types/props";
import type {
  PromotionCopyCode,
  PromotionOptionDTO,
  PromotionPlacement,
} from "types/api/promotion";
import { createPromotionCheckoutAction } from "./actions";

const SCOPE_ORDER: readonly PromotionPlacement[] = [
  "CITY",
  "REGION",
  "PROVINCE",
  "CATALONIA",
];

export default function PromoteEventClient({
  eventId,
  slug,
  options,
  pendingCheckoutUrl,
  placeNames,
}: PromoteEventClientProps) {
  const t = useTranslations("App.EventPromote");
  const locale = useLocale();
  const catalog = options.ok ? options.data.options : [];
  const canPurchase = options.ok && options.data.canPurchase;
  const unavailableCode = options.ok
    ? (options.data.unavailableReason ?? "NO_AVAILABLE_OPTIONS")
    : options.code;
  const scopes = SCOPE_ORDER.filter((scope) =>
    catalog.some((option) => option.scope === scope),
  );
  // Cards render shortest first, so the default pick follows that order.
  const optionsIn = (scope: PromotionPlacement | null) =>
    catalog
      .filter((option) => option.scope === scope)
      .sort((a, b) => a.durationDays - b.durationDays);
  const firstAvailableIn = (scope: PromotionPlacement | null) =>
    optionsIn(scope).find((option) => option.available)?.id ?? null;

  const defaultScope = () =>
    scopes.find((scope) => firstAvailableIn(scope)) ?? scopes[0] ?? null;

  const [activeScope, setActiveScope] = useState(defaultScope);
  const [selectedId, setSelectedId] = useState(() =>
    firstAvailableIn(activeScope),
  );
  // A session refresh re-renders with the options; re-pick once they arrive.
  const [hadOptions, setHadOptions] = useState(options.ok);
  if (options.ok !== hadOptions) {
    setHadOptions(options.ok);
    const scope = defaultScope();
    setActiveScope(scope);
    setSelectedId(firstAvailableIn(scope));
  }
  const scopeOptions = optionsIn(activeScope);

  const selectScope = (scope: PromotionPlacement) => {
    if (scope === activeScope) return;
    setActiveScope(scope);
    setSelectedId(firstAvailableIn(scope));
  };

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const handleTabKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = scopes[(index + offset + scopes.length) % scopes.length];
    selectScope(next);
    document.getElementById(`promote-tab-${next}`)?.focus();
  };
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

  // Unknown backend codes fall back to the generic message.
  const describeCode = (code: string) => {
    const key = `errors.${code}` as `errors.${PromotionCopyCode}`;
    return t.has(key) ? t(key) : t("errorGeneric");
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
    <div className="max-w-[720px] mx-auto py-section-y px-section-x">
      <Link
        href={`/e/${slug}`}
        className="inline-flex items-center gap-1 body-small text-muted-foreground hover:text-foreground mb-4"
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
              className="btn-outline w-full"
              data-testid="promote-resume-checkout"
            >
              {t("resumeCheckout")}
            </a>
          </div>
        )}

        {canPurchase ? (
          <div className="flex flex-col gap-4">
            <h2 className="body-normal font-semibold text-foreground-strong">
              {t("chooseOption")}
            </h2>

            <div
              role="tablist"
              aria-label={t("chooseOption")}
              className="grid grid-cols-2 sm:flex border-b border-border"
            >
              {scopes.map((scope, index) => {
                const isActive = scope === activeScope;
                const placeName = placeNames[scope];
                return (
                  <button
                    key={scope}
                    type="button"
                    role="tab"
                    id={`promote-tab-${scope}`}
                    aria-selected={isActive}
                    aria-controls={
                      isActive ? `promote-panel-${scope}` : undefined
                    }
                    tabIndex={isActive ? 0 : -1}
                    disabled={isSubmitting}
                    onClick={() => selectScope(scope)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                    data-testid={`promote-tab-${scope}`}
                    className={`sm:flex-1 min-w-0 flex flex-col items-center gap-0.5 px-3 py-3 text-center -mb-px border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="body-small">{t(`scope.${scope}`)}</span>
                    {placeName && (
                      <span className="body-normal font-semibold">
                        {placeName}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {activeScope && (
              <div
                role="tabpanel"
                id={`promote-panel-${activeScope}`}
                aria-labelledby={`promote-tab-${activeScope}`}
                className="grid gap-3 sm:grid-flow-col sm:auto-cols-[minmax(9rem,1fr)] sm:overflow-x-auto sm:snap-x sm:pb-1"
              >
                {scopeOptions.map((option) => {
                  const isSelected = selectedId === option.id;
                  return (
                    <label
                      key={option.id}
                      data-testid={`promote-option-${option.id}`}
                      className={`card-bordered card-body snap-start flex flex-col items-center gap-2 text-center transition-colors ${
                        option.available
                          ? "cursor-pointer hover:border-primary"
                          : "opacity-50 cursor-not-allowed"
                      } ${isSelected ? "border-primary ring-1 ring-primary" : ""}`}
                    >
                      <input
                        type="radio"
                        name="promotion-option"
                        value={option.id}
                        checked={isSelected}
                        disabled={!option.available || isSubmitting}
                        onChange={() => setSelectedId(option.id)}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="body-normal text-foreground-strong">
                        {t("duration", { days: option.durationDays })}
                      </span>
                      <span className="heading-3 text-foreground-strong">
                        {formatPrice(option)}
                      </span>
                      {!option.available && option.unavailableReason && (
                        <span className="body-small text-muted-foreground">
                          {describeCode(option.unavailableReason)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {catalog.every((option) => option.taxIncluded) && (
              <p className="body-small text-muted-foreground">{t("taxIncluded")}</p>
            )}
          </div>
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
            <p className="text-sm font-medium text-error-dark">
              {describeCode(errorCode)}
            </p>
          </div>
        )}

        {canPurchase && (
          <Button
            type="button"
            variant="primary"
            className="w-full"
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
