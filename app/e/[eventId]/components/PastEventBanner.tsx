import type { PastEventBannerProps } from "types/common";
import { ClockIcon } from "@heroicons/react/outline";

export default function PastEventBanner({
  temporalStatus,
  cityName,
  regionName,
  explorePlaceHref,
  exploreCategoryHref,
  primaryCategorySlug,
}: PastEventBannerProps) {
  const placeLabel = cityName || regionName || "Catalunya";
  const timeWindow = "aquesta setmana";

  return (
    <div className="w-full px-section-x py-6">
      <div
        className="card-bordered max-w-3xl mx-auto bg-muted/30"
        role="status"
        aria-live="polite"
      >
        <div className="card-body">
          {/* Visual indicator with icon */}
          <div className="flex sm:items-start md:items-center gap-4 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-foreground/60" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="heading-3 text-foreground-strong mb-2">
                Aquest esdeveniment ja ha finalitzat
              </h3>
              <p className="body-small text-foreground/60">
                No et perdis els propers esdeveniments {timeWindow} a{" "}
                {placeLabel}
              </p>
              {/* Hidden readable state for screen readers */}
              <span className="sr-only">Estat: {temporalStatus.label}.</span>
            </div>
          </div>

          {/* Single primary CTA with optional secondary link */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-start md:justify-center">
            <a
              href={explorePlaceHref}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground body-normal font-medium hover:bg-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
            >
              Descobreix esdeveniments a {placeLabel}
            </a>

            {primaryCategorySlug && (
              <a
                href={exploreCategoryHref}
                className="body-small text-primary hover:text-primary-dark font-medium transition-colors sm:ml-2 inline-flex items-center gap-1"
              >
                o explora aquesta categoria
                <span aria-hidden="true">→</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
