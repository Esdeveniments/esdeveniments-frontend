"use client";

import { startTransition, type JSX, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { useFilterLoading } from "@components/context/FilterLoadingContext";
import { useSharedUrlFilters } from "@components/context/UrlFiltersContext";
import { useSearchPlaces } from "@components/hooks/useSearchPlaces";
import {
  isPlainLeftClick,
  startNavigationFeedback,
} from "@lib/navigation-feedback";
import { sendGoogleEvent } from "@utils/analytics";
import { omitDefaultFilterValue } from "@utils/constants";
import { scheduleIdleCallback } from "@utils/browser";
import {
  getSearchRecoveryLinks,
  getSuggestedPlaceLinks,
} from "@utils/search-recovery";
import type { SearchRecoveryAction } from "types/filters";

const LABEL_KEYS = {
  place: "recoveryPlace",
  date: "recoveryDate",
  category: "recoveryCategory",
  distance: "recoveryDistance",
} as const satisfies Record<SearchRecoveryAction, string>;

/** Links that suggest a place or widen one filter of a search with no results. */
export default function SearchRecoveryLinks(): JSX.Element | null {
  const t = useTranslations("Components.HybridEventsListClient");
  const { setLoading } = useFilterLoading();
  const { segments, queryParams } = useSharedUrlFilters();
  const search = queryParams.search;
  const places = useSearchPlaces(Boolean(search));
  if (!search) return null;

  const suggestedPlaces = getSuggestedPlaceLinks(segments, queryParams, places);
  const links = getSearchRecoveryLinks(segments, queryParams);
  if (suggestedPlaces.length === 0 && links.length === 0) return null;

  const handleNavigate = (e: MouseEvent) => {
    if (isPlainLeftClick(e)) {
      startNavigationFeedback();
      startTransition(() => setLoading(true));
    }
  };

  const handleRecoveryClick = (e: MouseEvent, action: SearchRecoveryAction) => {
    const placeSlug = segments.place || undefined;
    const categorySlug = omitDefaultFilterValue(segments.category);
    scheduleIdleCallback(() =>
      sendGoogleEvent("zero_results_recovery", {
        action,
        ...(placeSlug ? { place_slug: placeSlug } : {}),
        ...(categorySlug ? { category_slug: categorySlug } : {}),
      }),
    );
    handleNavigate(e);
  };

  const handlePlaceClick = (e: MouseEvent, slug: string) => {
    scheduleIdleCallback(() =>
      sendGoogleEvent("zero_results_recovery", {
        action: "place_suggestion",
        place_slug: slug,
      }),
    );
    handleNavigate(e);
  };

  return (
    <div className="stack items-center" data-testid="search-recovery">
      {suggestedPlaces.length > 0 && (
        <nav
          aria-label={t("didYouMean")}
          className="stack items-center gap-element-gap-sm"
          data-testid="search-place-suggestions"
        >
          <p className="body-small text-muted-foreground">{t("didYouMean")}</p>
          <ul className="flex flex-wrap justify-center gap-element-gap-sm">
            {suggestedPlaces.map(({ label, slug, href }) => (
              <li key={slug}>
                <Link
                  href={href}
                  prefetch={false}
                  className="btn-outline"
                  onClick={(e) => handlePlaceClick(e, slug)}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {links.length > 0 && (
        <nav
          aria-label={t("recoveryTitle")}
          className="stack items-center gap-element-gap-sm"
        >
          <p className="body-small text-muted-foreground">
            {t("recoveryTitle")}
          </p>
          <ul className="flex flex-wrap justify-center gap-element-gap-sm">
            {links.map(({ action, href }) => (
              <li key={action}>
                <Link
                  href={href}
                  prefetch={false}
                  className="btn-outline"
                  onClick={(e) => handleRecoveryClick(e, action)}
                >
                  {t(LABEL_KEYS[action], { search })}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
