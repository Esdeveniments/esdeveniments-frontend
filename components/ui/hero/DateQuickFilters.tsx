import { CheckIcon } from "@heroicons/react/solid";
import { useTranslations } from "next-intl";
import { useHero } from "./HeroContext";
import { HERO_DATE_FILTERS } from "./constants";
import type { JSX } from "react";
import { sendGoogleEvent } from "@utils/analytics";

export default function DateQuickFilters(): JSX.Element {
  const t = useTranslations("Components.HeroFilters");
  const { date, setDate } = useHero();

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
      {HERO_DATE_FILTERS.map((filter) => {
        const label = t(filter.labelKey);
        const isActive = date === filter.value;

        return (
          <button
            key={filter.value}
            type="button"
            aria-pressed={isActive}
            aria-label={`${label}${isActive ? ` (${t("active")})` : ""}`}
            onClick={() => {
              const nextValue = isActive ? null : filter.value;
              setDate(nextValue);
              sendGoogleEvent("hero_date_filter_toggle", {
                category: "hero_filters",
                context: "home_hero",
                date_slug: filter.value,
                is_active: String(!isActive),
              });
            }}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all border outline-none focus:ring-2 focus:ring-primary/50 relative
              ${isActive
                ? "bg-primary text-white border-primary shadow-md pl-9"
                : "bg-background text-foreground/80 border-border hover:border-primary hover:text-primary hover:bg-primary/5"
              }
            `}
          >
            {isActive && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                <CheckIcon className="w-4 h-4" />
              </span>
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}
