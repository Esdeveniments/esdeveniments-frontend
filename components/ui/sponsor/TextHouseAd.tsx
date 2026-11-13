"use client";

import { Link } from "@i18n/routing";
import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import type { TextHouseAdProps } from "types/sponsor";

/**
 * CSS-rendered house ad banner — no image required.
 * Shows a styled promotional banner linking to /patrocina.
 *
 * Shows sponsors what a filled slot looks like. Neutral like any card (red is
 * kept for the page's main action) and left-aligned with the page's text.
 */
export default function TextHouseAd({ houseAd, place }: TextHouseAdProps) {
  const t = useTranslations("Sponsor");

  return (
    <div className="relative w-full mt-6" data-testid="house-ad-text">
      <Link
        href="/patrocina"
        className="group flex items-center gap-element-gap w-full rounded-card border border-border/40 bg-muted/20 p-card-padding-sm transition-colors hover:border-border focus-ring"
        data-analytics-event-name="house_ad_click"
        data-analytics-link-type="house_ad"
        data-analytics-house-ad-id={houseAd.id}
        data-analytics-house-ad-type="text"
        data-analytics-house-ad-place={place}
      >
        <span className="stack gap-1 min-w-0 flex-1">
          <span className="body-small text-muted-foreground">{t("houseAdLabel")}</span>
          <span className="heading-4 text-foreground-strong">
            {t(`houseAd.${houseAd.headlineKey}`)}
          </span>
          <span className="body-normal text-foreground/80">
            {t(`houseAd.${houseAd.subtitleKey}`)}
          </span>
        </span>
        <ChevronRightIcon
          className="h-5 w-5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
