"use client";

import { startTransition, type JSX, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { useFilterLoading } from "@components/context/FilterLoadingContext";
import { useSharedUrlFilters } from "@components/context/UrlFiltersContext";
import {
  isPlainLeftClick,
  startNavigationFeedback,
} from "@lib/navigation-feedback";
import { sendGoogleEvent } from "@utils/analytics";
import { scheduleIdleCallback } from "@utils/browser";
import { getSearchRecoveryLinks } from "@utils/search-recovery";
import type { SearchRecoveryAction } from "types/filters";

const LABEL_KEYS = {
  place: "recoveryPlace",
  date: "recoveryDate",
  category: "recoveryCategory",
  distance: "recoveryDistance",
} as const satisfies Record<SearchRecoveryAction, string>;

/** Links that widen one filter of a search with no results. Reads the URL. */
export default function SearchRecoveryLinks(): JSX.Element | null {
  const t = useTranslations("Components.HybridEventsListClient");
  const { setLoading } = useFilterLoading();
  const { segments, queryParams } = useSharedUrlFilters();
  const search = queryParams.search;
  if (!search) return null;
  const links = getSearchRecoveryLinks(segments, queryParams);
  if (links.length === 0) return null;

  const handleClick = (e: MouseEvent, action: SearchRecoveryAction) => {
    scheduleIdleCallback(() =>
      sendGoogleEvent("zero_results_recovery", { action }),
    );
    if (isPlainLeftClick(e)) {
      startNavigationFeedback();
      startTransition(() => setLoading(true));
    }
  };

  return (
    <nav
      aria-label={t("recoveryTitle")}
      className="stack items-center gap-element-gap-sm"
      data-testid="search-recovery"
    >
      <p className="body-small text-muted-foreground">{t("recoveryTitle")}</p>
      <ul className="flex flex-wrap justify-center gap-element-gap-sm">
        {links.map(({ action, href }) => (
          <li key={action}>
            <Link
              href={href}
              prefetch={false}
              className="btn-outline"
              onClick={(e) => handleClick(e, action)}
            >
              {t(LABEL_KEYS[action], { search })}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
