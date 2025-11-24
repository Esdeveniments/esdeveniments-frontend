"use client";

import { useHero } from "./HeroContext";
import { useRouter } from "next/navigation";
import { startNavigationFeedback } from "@lib/navigation-feedback";
import { SearchIcon } from "@heroicons/react/solid";
import Button from "@components/ui/common/button";
import { buildHeroUrl } from "./utils";
import { HERO_DATE_FILTERS } from "./constants";

export default function HeroCTA() {
  const { place, label, date, searchTerm } = useHero();
  const router = useRouter();

  const handleSearch = () => {
    const url = buildHeroUrl(place, date, searchTerm);
    startNavigationFeedback();
    router.push(url);
  };

  const getButtonText = () => {
    let text = "Veure esdeveniments";

    if (place !== "catalunya") {
      text += ` a ${label}`;
    }

    if (date) {
      const filter = HERO_DATE_FILTERS.find(f => f.value === date);
      if (filter) {
        const dateLabel = date === "cap-de-setmana" ? "aquest cap de setmana" : filter.label.toLowerCase();
        text += ` ${dateLabel}`;
      }
    }

    return text;
  };

  return (
    <div className="flex flex-col items-center justify-center mt-8">
      <Button
        type="button"
        variant="primary"
        onClick={handleSearch}
        className="text-lg px-8 py-3 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 max-w-full"
      >
        <SearchIcon className="w-5 h-5 flex-shrink-0" />
        <span className="truncate max-w-[300px] sm:max-w-none">{getButtonText()}</span>
      </Button>
      <p className="text-xs text-foreground/50 mt-3 text-center">
        Selecciona la població i les dates, i prem &apos;Veure esdeveniments&apos;
      </p>
    </div>
  );
}
