import type { PastEventBannerProps } from "types/common";
import { Text } from "@components/ui/primitives/Text";

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
    <div className="mt-component-md flex w-full items-start justify-center px-component-md sm:px-component-lg">
      <div
        className="flex w-11/12 flex-col gap-component-md rounded-lg bg-darkCorp p-component-lg shadow-sm sm:w-10/12 lg:w-3/4"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col gap-component-sm">
          <Text
            as="h3"
            variant="body-lg"
            className="font-semibold uppercase leading-tight tracking-wide"
          >
            Finalitzat — Descobreix alternatives
          </Text>
          <Text
            as="p"
            variant="body-sm"
            className="max-w-prose leading-relaxed text-blackCorp/75"
          >
            Ja ha finalitzat. No et perdis els que venen: descobreix què passa a{" "}
            {placeLabel} {timeWindow}.
          </Text>
          {/* Hidden readable state for screen readers */}
          <span className="sr-only">Estat: {temporalStatus.label}.</span>
        </div>

        <div className="flex flex-col gap-component-sm">
          <a
            href={explorePlaceHref}
            aria-label={`Veure esdeveniments a ${placeLabel}`}
            className="inline-flex w-full items-center justify-center rounded-lg bg-blackCorp px-component-lg py-component-sm font-medium text-whiteCorp transition-colors hover:bg-blackCorp/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blackCorp/50"
          >
            <Text size="sm">Veure esdeveniments a {placeLabel}</Text>
          </a>

          {primaryCategorySlug ? (
            <a
              href={exploreCategoryHref}
              aria-label={`Més d'aquesta categoria`}
              className="bg-transparent inline-flex w-full items-center justify-center rounded-lg border border-blackCorp/30 px-component-lg py-component-sm font-medium text-blackCorp transition-colors hover:bg-blackCorp/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blackCorp/30"
            >
              <Text size="sm">Més d&apos;aquesta categoria</Text>
            </a>
          ) : (
            <a
              href={explorePlaceHref}
              aria-label={`Explorar més esdeveniments a ${placeLabel}`}
              className="bg-transparent inline-flex w-full items-center justify-center rounded-lg border border-blackCorp/30 px-component-lg py-component-sm font-medium text-blackCorp transition-colors hover:bg-blackCorp/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blackCorp/30"
            >
              <Text size="sm">Explorar més</Text>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
