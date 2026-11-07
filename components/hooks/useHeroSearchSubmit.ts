"use client";

import { useCallback } from "react";
import { useRouter } from "@i18n/routing";
import { useSearchPlaces } from "@components/hooks/useSearchPlaces";
import { useHero } from "@components/ui/hero/HeroContext";
import { buildHeroUrl } from "@components/ui/hero/utils";
import { startNavigationFeedback } from "@lib/navigation-feedback";
import { markTextSearchSubmitted, sendPlaceRedirectGA } from "@utils/analytics";
import { placeForSearch } from "@utils/search-query";
import type { SearchBoxSuggestion } from "types/search";

/**
 * Submits the hero search (Enter, the hero button or a picked suggestion).
 * Without a suggestion, a typed place name opens that place; anything else is
 * a text search in the selected place. Places load once there is text, so
 * until they arrive a place name stays a search.
 */
export function useHeroSearchSubmit(
  context: "hero_search" | "hero_cta",
): (suggestion?: SearchBoxSuggestion) => void {
  const { place, date, searchTerm, setSearchTerm } = useHero();
  const router = useRouter();
  const places = useSearchPlaces(searchTerm.trim().length > 0);

  return useCallback(
    (suggestion?: SearchBoxSuggestion) => {
      const value = searchTerm.trim();
      const matchedPlace = placeForSearch(value, places, suggestion);
      startNavigationFeedback();
      if (matchedPlace) {
        if (!suggestion) sendPlaceRedirectGA(context, value, matchedPlace.value);
        setSearchTerm("");
        router.push(buildHeroUrl(matchedPlace.value, date, ""));
        return;
      }
      markTextSearchSubmitted(context, value);
      // Navigates even with an empty search, to clear the param.
      router.push(buildHeroUrl(place, date, value));
    },
    [context, searchTerm, places, place, date, router, setSearchTerm],
  );
}
