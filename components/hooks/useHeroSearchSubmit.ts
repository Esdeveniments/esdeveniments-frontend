"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "@i18n/routing";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import { useHero } from "@components/ui/hero/HeroContext";
import { buildHeroUrl } from "@components/ui/hero/utils";
import { startNavigationFeedback } from "@lib/navigation-feedback";
import { sendPlaceRedirectGA } from "@utils/analytics";
import { generateRegionsAndTownsOptions } from "@utils/helpers";
import { matchSearchToPlace } from "@utils/string-helpers";

/**
 * Submits the hero search (Enter or the hero button). A typed place name opens
 * that place; anything else is a text search in the selected place. Places
 * load once there is text, so until they arrive a place name stays a search.
 */
export function useHeroSearchSubmit(
  context: "hero_search" | "hero_cta",
): () => void {
  const { place, date, searchTerm, setSearchTerm } = useHero();
  const router = useRouter();
  const { regionsWithCities } = useGetRegionsWithCities(
    searchTerm.trim().length > 0,
  );
  const places = useMemo(
    () =>
      regionsWithCities
        ? generateRegionsAndTownsOptions(regionsWithCities).flatMap(
            (group) => group.options,
          )
        : [],
    [regionsWithCities],
  );

  return useCallback(() => {
    const value = searchTerm.trim();
    const matchedPlace = value ? matchSearchToPlace(value, places) : null;
    startNavigationFeedback();
    if (matchedPlace) {
      sendPlaceRedirectGA(context, value, matchedPlace.value);
      setSearchTerm("");
      router.push(buildHeroUrl(matchedPlace.value, date, ""));
      return;
    }
    // Navigates even with an empty search, to clear the param.
    router.push(buildHeroUrl(place, date, value));
  }, [context, searchTerm, places, place, date, router, setSearchTerm]);
}
