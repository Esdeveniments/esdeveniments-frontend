import type { PastEventBannerProps } from "types/common";

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
    <div className="w-full flex justify-center items-start px-4 sm:px-6 mt-4">
      <div
        className="w-11/12 sm:w-10/12 lg:w-3/4 bg-foreground-strong rounded-lg p-6 flex flex-col gap-4 shadow-sm min-w-0"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col gap-3">
          <h3 className="heading-4 text-foreground-strong">
            Finalitzat — Descobreix alternatives
          </h3>
          <p className="body-small text-foreground-strong/75 max-w-prose">
            Ja ha finalitzat. No et perdis els que venen: descobreix què passa a{" "}
            {placeLabel} {timeWindow}.
          </p>
          {/* Hidden readable state for screen readers */}
          <span className="sr-only">Estat: {temporalStatus.label}.</span>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={explorePlaceHref}
            aria-label={`Veure esdeveniments a ${placeLabel}`}
            className="w-full inline-flex items-center justify-center rounded-lg bg-foreground-strong text-background body-small font-medium px-6 py-3 hover:bg-foreground-strong/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground-strong/50"
          >
            Veure esdeveniments a {placeLabel}
          </a>

          {primaryCategorySlug ? (
            <a
              href={exploreCategoryHref}
              aria-label={`Més d'aquesta categoria`}
              className="w-full inline-flex items-center justify-center rounded-lg border border-foreground-strong/30 bg-transparent text-foreground-strong body-small font-medium px-6 py-3 hover:bg-foreground-strong/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground-strong/30"
            >
              Més d&apos;aquesta categoria
            </a>
          ) : (
            <a
              href={explorePlaceHref}
              aria-label={`Explorar més esdeveniments a ${placeLabel}`}
              className="w-full inline-flex items-center justify-center rounded-lg border border-foreground-strong/30 bg-transparent text-foreground-strong body-small font-medium px-6 py-3 hover:bg-foreground-strong/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground-strong/30"
            >
              Explorar més
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
