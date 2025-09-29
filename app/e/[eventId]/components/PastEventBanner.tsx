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
        className="w-11/12 sm:w-10/12 lg:w-3/4 bg-darkCorp rounded-lg p-6 flex flex-col gap-4 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold tracking-wide uppercase text-blackCorp leading-tight">
            Finalitzat — Descobreix alternatives
          </h3>
          <p className="text-sm text-blackCorp/75 max-w-prose leading-relaxed">
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
            className="w-full inline-flex items-center justify-center rounded-lg bg-blackCorp text-whiteCorp text-sm font-medium px-6 py-3 hover:bg-blackCorp/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blackCorp/50"
          >
            Veure esdeveniments a {placeLabel}
          </a>

          {primaryCategorySlug ? (
            <a
              href={exploreCategoryHref}
              aria-label={`Més d'aquesta categoria`}
              className="w-full inline-flex items-center justify-center rounded-lg border border-blackCorp/30 bg-transparent text-blackCorp text-sm font-medium px-6 py-3 hover:bg-blackCorp/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blackCorp/30"
            >
              Més d&apos;aquesta categoria
            </a>
          ) : (
            <a
              href={explorePlaceHref}
              aria-label={`Explorar més esdeveniments a ${placeLabel}`}
              className="w-full inline-flex items-center justify-center rounded-lg border border-blackCorp/30 bg-transparent text-blackCorp text-sm font-medium px-6 py-3 hover:bg-blackCorp/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blackCorp/30"
            >
              Explorar més
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
