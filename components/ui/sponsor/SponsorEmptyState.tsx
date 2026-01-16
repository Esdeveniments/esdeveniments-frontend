"use client";

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
      className="group flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 transition-colors hover:border-primary hover:bg-muted/50"
    >
      <span className="body-small text-foreground/60 group-hover:text-primary">
        {t("emptyState")}
      </span>
      <span className="text-xs text-foreground/40 group-hover:text-primary/80">
        →
      </span>
    </Link>
  );
}
