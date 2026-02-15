"use client";

import { Link } from "@i18n/routing";
import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import type { TextHouseAdProps } from "types/sponsor";

/**
 * CSS-rendered house ad banner — no image required.
 * Shows a styled promotional banner linking to /patrocina.
 *
 * Visually distinct from SponsorEmptyState: this looks like an actual ad
 * (full-width banner with gradient background) rather than a plain CTA card.
 * Demonstrates to potential sponsors what the ad slot looks like when filled.
 */
export default function TextHouseAd({ houseAd, place }: TextHouseAdProps) {
  const t = useTranslations("Sponsor");

  return (
    <div className="relative w-full mt-6" data-testid="house-ad-text">
      <Link
        href="/patrocina"
        className="group block w-full overflow-hidden rounded-card border border-border bg-muted/20 transition-shadow hover:shadow-md hover:border-primary focus-ring"
        data-analytics-event-name="house_ad_click"
        data-analytics-house-ad-id={houseAd.id}
        data-analytics-house-ad-type="text"
        data-analytics-house-ad-place={place}
      >
        <div className="flex-start px-card-padding-sm pt-card-padding-sm pb-element-gap-sm">
          <span className="badge-default">{t("houseAdLabel")}</span>
        </div>
        <div className="flex-center flex-col gap-element-gap-sm pb-4">
          <span className="heading-3 text-foreground-strong group-hover:text-primary text-center">
            {t(`houseAd.${houseAd.headlineKey}`)}
          </span>
          <div className="flex-center gap-element-gap-sm">
            <span className="body-normal text-foreground/80 group-hover:text-foreground text-center">
              {t(`houseAd.${houseAd.subtitleKey}`)}
            </span>
            <ChevronRightIcon
              className="h-4 w-4 shrink-0 text-foreground/60 group-hover:text-primary"
              aria-hidden="true"
            />
          </div>
        </div>
      </Link>
    </div>
  );
}
