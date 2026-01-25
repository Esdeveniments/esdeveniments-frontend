"use client";

import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { MegaphoneIcon as SpeakerphoneIcon } from "@heroicons/react/24/outline";
import { Link } from "@i18n/routing";
import { useTranslations } from "next-intl";

/**
 * CTA component shown when no sponsor is active for a place.
 * Links to /patrocina landing page.
 */
export default function SponsorEmptyState() {
  const t = useTranslations("Sponsor");

  return (
    <Link
      href="/patrocina"
      className="group card-bordered card-body flex-center flex-col gap-element-gap bg-muted/20 text-center transition-colors hover:border-primary hover:bg-muted/30 focus-ring"
    >
      <span className="badge-primary mt-1 opacity-90">
        {t("label")}
      </span>
      <div className="flex-center gap-element-gap-sm">
        <SpeakerphoneIcon
          className="h-5 w-5 text-foreground-strong group-hover:text-primary"
          aria-hidden="true"
        />
        <span className="body-large text-foreground-strong group-hover:text-primary">
          {t("cta")}
        </span>
        <ChevronRightIcon
          className="h-4 w-4 text-foreground/60 group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
      <span className="body-small text-foreground/80 group-hover:text-foreground/90">
        {t("emptyState")}
      </span>
    </Link>
  );
}
