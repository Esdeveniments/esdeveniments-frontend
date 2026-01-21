"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { SPONSOR_BANNER_IMAGE } from "@utils/constants";
import type { SponsorBannerProps } from "types/sponsor";

/**
 * Client component that renders the sponsor banner with image error handling.
 * Shows the sponsor image with proper SEO attributes and fallback on error.
 */
export default function SponsorBanner({ sponsor, place }: SponsorBannerProps) {
  const t = useTranslations("Sponsor");
  const [hasError, setHasError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(
    SPONSOR_BANNER_IMAGE.IDEAL_ASPECT_RATIO
  );

  if (hasError) {
    // Hide banner if image fails to load
    return null;
  }

  return (
    <div className="relative w-full mt-6" data-testid="sponsor-banner">
      {/* EU Ad Transparency Label - WCAG accessible contrast */}
      <span className="absolute -top-5 left-0 text-xs text-foreground/70">
        {t("label")}
      </span>

      <a
        href={sponsor.targetUrl}
        target="_blank"
        rel="sponsored noopener"
        className={`group block w-full overflow-hidden rounded-lg bg-muted/20 transition-shadow hover:shadow-md ${
          hasLoaded ? "border border-transparent" : "border border-border"
        }`}
        data-analytics-event-name="sponsor_click"
        data-analytics-sponsor-name={sponsor.businessName}
        data-analytics-sponsor-place={place}
        data-analytics-sponsor-geo-scope={sponsor.geoScope}
      >
        <div
          className="relative w-full min-h-[80px] max-h-[160px] md:min-h-[100px] md:max-h-[180px]"
          style={{ aspectRatio }}
        >
          <Image
            src={sponsor.imageUrl}
            alt={sponsor.businessName}
            fill
            sizes="(max-width: 768px) 100vw, 728px"
            className="object-contain"
            unoptimized
            onError={() => setHasError(true)}
            onLoadingComplete={(img) => {
              setHasLoaded(true);
              if (!img.naturalWidth || !img.naturalHeight) return;
              const ratio = img.naturalWidth / img.naturalHeight;
              const clampedRatio = Math.min(
                SPONSOR_BANNER_IMAGE.MAX_ASPECT_RATIO,
                Math.max(SPONSOR_BANNER_IMAGE.MIN_ASPECT_RATIO, ratio)
              );
              setAspectRatio((current) =>
                Math.abs(current - clampedRatio) < 0.01 ? current : clampedRatio
              );
            }}
          />
        </div>
      </a>
    </div>
  );
}
