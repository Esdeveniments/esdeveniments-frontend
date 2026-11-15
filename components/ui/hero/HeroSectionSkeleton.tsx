import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon as SearchIcon,
} from "@heroicons/react/24/solid";
import Button from "@components/ui/common/button";
import { getMonthNames } from "@utils/constants";
import { madridTodayYmd } from "@lib/dates";
import {
  formatPlacePrepositionParts,
  joinPlacePhrase,
} from "@utils/string-helpers";
import { HERO_DATE_FILTERS } from "./constants";
import type { AppLocale } from "types/i18n";
import type { HeroSectionSkeletonProps, HeroSkeletonCopy } from "types/props";

// The month changes how the subtitle wraps. The page shell may read the clock
// only inside "use cache"; an hour-old month matters only at a month change.
async function madridMonthIndexCached(): Promise<number> {
  "use cache";
  cacheLife("hours");
  return Number(madridTodayYmd().slice(5, 7)) - 1;
}

export async function getHeroSkeletonCopy(
  locale: AppLocale,
  subTitle?: string,
): Promise<HeroSkeletonCopy> {
  const [tSearch, tFilters, tCta, tPages, monthIndex] = await Promise.all([
    getTranslations({ locale, namespace: "Components.HeroSearch" }),
    getTranslations({ locale, namespace: "Components.HeroFilters" }),
    getTranslations({ locale, namespace: "Components.HeroCTA" }),
    getTranslations({ locale, namespace: "Partials.GeneratePagesData" }),
    subTitle === undefined ? madridMonthIndexCached() : undefined,
  ]);
  // HeroProvider starts on Catalunya.
  const placeParts = formatPlacePrepositionParts(
    "Catalunya",
    "region",
    locale,
    false,
  );
  return {
    titlePrefix: `${tSearch("titlePrefix")} ${placeParts.preposition}`,
    place: placeParts.place,
    subTitle:
      subTitle ??
      tPages("root.subTitle", { month: getMonthNames(locale)[monthIndex ?? 0] }),
    searchPlaceholder: tSearch("searchPlaceholder", {
      placeIn: joinPlacePhrase(placeParts),
    }),
    dateLabels: HERO_DATE_FILTERS.map((filter) => tFilters(filter.labelKey)),
    ctaLabel: tCta("buttonBase"),
    ctaHelper: tCta("helper"),
  };
}

// Copies HeroSection box for box (same classes and text), so swapping it for
// the real hero changes nothing on screen and moves nothing below it.
export default function HeroSectionSkeleton({ copy }: HeroSectionSkeletonProps) {
  return (
    <div inert aria-hidden="true" data-testid="hero-section-skeleton">
      <div className="w-full flex flex-col gap-4">
        <div className="flex flex-col items-center justify-center text-center gap-2">
          <div className="heading-1 text-white drop-shadow-lg flex flex-wrap items-center justify-center gap-2">
            <span>{copy.titlePrefix}</span>{" "}
            <div className="relative inline-block">
              <div className="flex flex-wrap items-center justify-center gap-2 font-semibold uppercase tracking-wide text-white text-center border-b-2 border-white/40">
                {copy.place}
                <ChevronDownIcon className="h-8 w-8" />
              </div>
            </div>
          </div>
          <p className="body-large text-white/90 drop-shadow-md max-w-xl mx-auto">
            {copy.subTitle}
          </p>
        </div>
        <div className="w-full max-w-2xl mx-auto relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center">
              <SearchIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="w-full pl-11 pr-12 py-3 bg-background border border-input rounded-full shadow-sm text-base text-muted-foreground truncate">
              {copy.searchPlaceholder}
            </div>
            <div className="btn-primary absolute inset-y-1 right-1 min-h-0 px-3.5 flex items-center justify-center rounded-full">
              <SearchIcon className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        {copy.dateLabels.map((label) => (
          <span
            key={label}
            className="inline-flex items-center min-h-button px-4 rounded-full text-sm font-medium border bg-white/15 text-white border-white/30 backdrop-blur-sm"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center mt-8 w-full px-4">
        <Button
          type="button"
          variant="primary"
          tabIndex={-1}
          className="px-6 shadow-lg w-full max-w-[20rem] sm:w-auto sm:max-w-xl text-center"
        >
          <SearchIcon className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-normal break-words">{copy.ctaLabel}</span>
        </Button>
        <p className="text-xs text-white mt-3 text-center">{copy.ctaHelper}</p>
      </div>
    </div>
  );
}
