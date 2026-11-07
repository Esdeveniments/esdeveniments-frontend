"use client";

import { useHero } from "./HeroContext";
import { useHeroSearchSubmit } from "@components/hooks/useHeroSearchSubmit";
import { useTranslations } from "next-intl";
import { MagnifyingGlassIcon as SearchIcon } from "@heroicons/react/24/solid";
import Button from "@components/ui/common/button";
import { HERO_DATE_FILTERS } from "./constants";
import { formatPlacePreposition } from "@utils/helpers";
import { sendGoogleEvent } from "@utils/analytics";
import useTrackedCta from "@components/hooks/useTrackedCta";
import { useLocale } from "next-intl";
import type { AppLocale } from "types/i18n";

export default function HeroCTA() {
  const t = useTranslations("Components.HeroCTA");
  const tFilters = useTranslations("Components.HeroFilters");
  const locale = useLocale();
  const { place, label, placeType, date, searchTerm } = useHero();
  const submitSearch = useHeroSearchSubmit("hero_cta");
  const { ref: ctaRef, trackClick } = useTrackedCta<HTMLDivElement>("hero_cta");

  const handleSearch = () => {
    trackClick();
    sendGoogleEvent("hero_cta_click", {
      category: "hero_cta",
      context: "home_hero",
      place_slug: place,
      date_slug: date || undefined,
      has_search: String(Boolean(searchTerm?.trim())),
    });
    submitSearch();
  };

  const getButtonText = () => {
    let text = t("buttonBase");

    if (place !== "catalunya") {
      const locationCopy = formatPlacePreposition(
        label,
        placeType,
        locale as AppLocale,
        false
      );
      text += ` ${locationCopy}`;
    }

    if (date) {
      const filter = HERO_DATE_FILTERS.find((f) => f.value === date);
      if (filter) {
        const translated = tFilters(filter.labelKey);
        const dateLabel =
          date === "cap-de-setmana" ? t("dateWeekend") : translated.toLowerCase();
        text += ` ${dateLabel}`;
      }
    }

    return text;
  };

  return (
    <div ref={ctaRef} className="flex flex-col items-center justify-center mt-8 w-full px-4">
      <Button
        type="button"
        variant="primary"
        onClick={handleSearch}
        // Submits the hero search: tapping it isn't an abandoned suggestion list.
        data-search-submit
        className="px-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 w-full max-w-[20rem] sm:w-auto sm:max-w-xl text-center"
      >
        <SearchIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span className="whitespace-normal break-words">
          {getButtonText()}
        </span>
      </Button>
      <p className="text-xs text-white mt-3 text-center">
        {t("helper")}
      </p>
    </div>
  );
}
