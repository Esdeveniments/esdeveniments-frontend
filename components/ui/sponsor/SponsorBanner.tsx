"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { SponsorBannerProps } from "types/sponsor";

/**
 * Client component that renders the sponsor banner with image error handling.
 * Shows the sponsor image with proper SEO attributes and fallback on error.
 */
export default function SponsorBanner({ sponsor }: SponsorBannerProps) {
  const t = useTranslations("Sponsor");
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    // Hide banner if image fails to load
    return null;
  }

  return (
    <div className="relative w-full">
      {/* EU Ad Transparency Label */}
      <span className="absolute -top-4 left-0 text-xs text-foreground/50">
        {t("label")}
      </span>

      <a
        href={sponsor.targetUrl}
        target="_blank"
        rel="sponsored noopener"
        className="group block w-full overflow-hidden rounded-lg border border-border bg-muted/20 transition-shadow hover:shadow-md"
        data-analytics-event-name="sponsor_click"
        data-analytics-sponsor-name={sponsor.businessName}
        data-analytics-sponsor-place={sponsor.places[0]}
        data-analytics-sponsor-geo-scope={sponsor.geoScope}
      >
        <div className="relative flex h-[100px] w-full items-center justify-center md:h-[120px]">
          <Image
            src={sponsor.imageUrl}
            alt={sponsor.businessName}
            fill
            sizes="(max-width: 768px) 100vw, 728px"
            className="object-contain"
            unoptimized
            onError={() => setHasError(true)}
          />
        </div>
      </a>
    </div>
  );
}
