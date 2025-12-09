import type { PastEventBannerProps } from "types/common";
import { ClockIcon } from "@heroicons/react/outline";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { useTranslations } from "next-intl";

export default function PastEventBanner({
  temporalStatus,
  cityName,
  regionName,
  explorePlaceHref,
  exploreCategoryHref,
  primaryCategorySlug,
}: PastEventBannerProps) {
  const t = useTranslations("Components.PastEventBanner");
  const placeLabel = cityName || regionName || "Catalunya";
  const timeWindow = t("timeWindow");

  return (
    <div className="w-full px-section-x py-5 sm:py-6">
      <div
        className="card-bordered max-w-3xl mx-auto bg-muted/30"
        role="status"
        aria-live="polite"
      >
        <div className="card-body">
          {/* Visual indicator with icon */}
          <div className="flex sm:items-start md:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-muted flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-foreground/60" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="heading-5 sm:heading-4 text-foreground-strong mb-1 sm:mb-1.5">
                {t("title")}
              </h3>
              <p className="body-small text-foreground/70 leading-snug">
                {t("subtitle", { timeWindow, placeLabel })}
              </p>
              {/* Hidden readable state for screen readers */}
              <span className="sr-only">
                {t("srStatus", { label: temporalStatus.label })}
              </span>
            </div>
          </div>

          {/* Single primary CTA with optional secondary link */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-start md:justify-center">
            <PressableAnchor
              href={explorePlaceHref}
              className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-primary-dark text-primary-foreground text-sm font-semibold hover:bg-primary-dark/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
              variant="inline"
            >
              {t("primaryCta")}
            </PressableAnchor>

            {primaryCategorySlug && (
              <PressableAnchor
                href={exploreCategoryHref}
                className="body-small text-primary hover:text-primary-dark font-medium transition-colors sm:ml-2 inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                variant="inline"
              >
                {t("secondaryCta")}
                <span aria-hidden="true">→</span>
              </PressableAnchor>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
