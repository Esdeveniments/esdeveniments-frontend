"use client";

import { useHero } from "./HeroContext";
import { useRouter } from "../../../i18n/routing";
import { useTranslations } from "next-intl";
import { startNavigationFeedback } from "@lib/navigation-feedback";
import { SearchIcon } from "@heroicons/react/solid";
import Button from "@components/ui/common/button";
import { buildHeroUrl } from "./utils";
import { HERO_DATE_FILTERS } from "./constants";
import { formatPlacePreposition } from "@utils/helpers";
import { sendGoogleEvent } from "@utils/analytics";
import { useLocale } from "next-intl";

export default function HeroCTA() {
  const t = useTranslations("Components.HeroCTA");
  const tFilters = useTranslations("Components.HeroFilters");
  const locale = useLocale();
  const { place, label, placeType, date, searchTerm } = useHero();
  const router = useRouter();

  const handleSearch = () => {
    sendGoogleEvent("hero_cta_click", {
      category: "hero_cta",
      context: "home_hero",
      place_slug: place,
      date_slug: date || undefined,
      has_search: String(Boolean(searchTerm?.trim())),
    });
    const url = buildHeroUrl(place, date, searchTerm);
    startNavigationFeedback();
    router.push(url);
  };

  const getButtonText = () => {
    let text = t("buttonBase");

    if (place !== "catalunya") {
      const locationCopy = formatPlacePreposition(
        label,
        (placeType || "general") as "region" | "town" | "general" | "",
        locale as "ca" | "es" | "en",
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
    <div className="flex flex-col items-center justify-center mt-8 w-full px-4">
      <Button
        type="button"
        variant="primary"
        onClick={handleSearch}
        className="text-base sm:text-lg leading-tight sm:leading-snug px-6 py-3 sm:px-8 sm:py-4 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 w-full max-w-[20rem] sm:max-w-xl text-center gap-2 sm:gap-3"
      >
        <SearchIcon className="w-5 h-5 flex-shrink-0" />
        <span className="whitespace-normal break-words leading-snug sm:leading-normal">
          {getButtonText()}
        </span>
      </Button>
      <p className="text-xs text-foreground/50 mt-3 text-center">
        {t("helper")}
      </p>
    </div>
  );
}
