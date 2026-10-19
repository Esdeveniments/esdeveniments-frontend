import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@i18n/routing";
import { isStripeCheckoutUrl } from "@lib/api/promotions";
import type { PromotionStatusPanelProps } from "types/props";

/**
 * Stripe's redirect proves nothing: the webhook confirms payment. So both
 * return pages render from GET /promotions/status, never from the URL.
 */
export default async function PromotionStatusPanel({
  slug,
  status,
  variant,
}: PromotionStatusPanelProps) {
  const t = await getTranslations("App.EventPromote");
  const locale = await getLocale();

  const isActive = status?.promotionStatus === "ACTIVE";
  const promotionEnded =
    status?.promotionStatus === "EXPIRED" || status?.promotionStatus === "REVOKED";
  const statusKey = !status
    ? "unknown"
    : isActive
      ? "ACTIVE"
      : promotionEnded
        ? `promotion${status.promotionStatus}` as const
        : status.paymentStatus;
  const statusText = isActive
    ? t("status.ACTIVE", {
        endsAt: status.endsAt
          ? new Intl.DateTimeFormat(locale, {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "Europe/Madrid",
            }).format(new Date(status.endsAt))
          : "",
      })
    : t(`status.${statusKey as Exclude<typeof statusKey, "ACTIVE">}`);
  const resumeUrl = isStripeCheckoutUrl(status?.checkoutUrl)
    ? status?.checkoutUrl
    : null;
  const pagePath = `/e/${slug}/promote/${variant}`;

  return (
    <main className="min-h-screen bg-background py-section-y px-section-x">
      <div
        className="max-w-3xl mx-auto text-center space-y-6"
        data-testid="promotion-status"
        data-status={statusKey}
      >
        <h1 className="heading-1">
          {variant === "cancel" ? t("cancelPage.title") : t("successPage.title")}
        </h1>
        <p className="body-large text-foreground/80">{statusText}</p>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          {status?.paymentStatus === "PENDING" && !resumeUrl && (
            <Link href={pagePath} className="btn-outline">
              {t("refreshStatus")}
            </Link>
          )}
          {resumeUrl && (
            <a href={resumeUrl} className="btn-primary">
              {t("resumeCheckout")}
            </a>
          )}
          {!isActive && status?.canPurchase && (
            <Link href={`/e/${slug}/promote`} className="btn-outline">
              {t("tryAgain")}
            </Link>
          )}
          <Link href={`/e/${slug}`} className={isActive ? "btn-primary" : "btn-outline"}>
            {t("backToEvent")}
          </Link>
        </div>
      </div>
    </main>
  );
}
