"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { SponsorBannerProps } from "types/sponsor";
import { SPONSOR_BANNER_IMAGE } from "@utils/constants";
import { useImageRetry } from "@components/hooks/useImageRetry";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
  getOptimalImageWidth,
} from "@utils/image-quality";
import { buildPictureSourceUrls } from "@utils/image-cache";

/**
 * Client component that renders the sponsor banner with image error handling.
 * Shows the sponsor image with proper SEO attributes and fallback on error.
 * 
 * Image loading strategy (flicker-free):
 * - Banner container is always visible (no hydration-dependent visibility)
 * - Image starts with opacity 1 for SSR compatibility
 * - Smooth fade-in transition only applies after first load event
 * - Only hides on persistent error (after retries exhausted)
 */
export default function SponsorBanner({ sponsor, place }: SponsorBannerProps) {
  const t = useTranslations("Sponsor");
  const [aspectRatio, setAspectRatio] = useState<number>(
    SPONSOR_BANNER_IMAGE.IDEAL_ASPECT_RATIO
  );
  const { hasError, handleError, handleLoad, showSkeleton, imageLoaded, getImageKey } =
    useImageRetry(2);

  const imageQuality = getOptimalImageQuality({
    isPriority: false,
    isExternal: true,
  });
  const imageWidth = getOptimalImageWidth("hero");
  const sizes = getOptimalImageSizes("hero");
  const sources = buildPictureSourceUrls(sponsor.imageUrl, undefined, {
    width: imageWidth,
    quality: imageQuality,
  });

  const handleImageLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      handleLoad();
      const img = event.currentTarget;
      if (!img.naturalWidth || !img.naturalHeight) return;
      const ratio = img.naturalWidth / img.naturalHeight;
      const clampedRatio = Math.min(
        SPONSOR_BANNER_IMAGE.MAX_ASPECT_RATIO,
        Math.max(SPONSOR_BANNER_IMAGE.MIN_ASPECT_RATIO, ratio)
      );
      setAspectRatio((current) =>
        Math.abs(current - clampedRatio) < 0.01 ? current : clampedRatio
      );
    },
    [handleLoad]
  );

  if (hasError || !sources.fallback) {
    // Hide banner if image fails to load
    return null;
  }

  return (
    <div className="relative w-full mt-6" data-testid="sponsor-banner">
      <a
        href={sponsor.targetUrl}
        target="_blank"
        rel="sponsored noopener"
        className={`group block w-full overflow-hidden rounded-card bg-muted/20 transition-shadow hover:shadow-md focus-ring ${
          imageLoaded ? "border border-transparent" : "border border-border"
        }`}
        data-analytics-event-name="sponsor_click"
        data-analytics-sponsor-name={sponsor.businessName}
        data-analytics-sponsor-place={place}
        data-analytics-sponsor-geo-scope={sponsor.geoScope}
        data-analytics-sponsor-url={sponsor.targetUrl}
      >
        <div className="flex-start px-card-padding-sm pt-card-padding-sm pb-element-gap-sm">
          <span className="badge-default">{t("label")}</span>
        </div>
        <div
          className="relative w-full min-h-[80px] max-h-[160px] md:min-h-[100px] md:max-h-[180px]"
          style={{ aspectRatio }}
        >
          {showSkeleton && !imageLoaded && (
            <div className="absolute inset-0 bg-muted animate-fast-pulse" />
          )}
          <picture key={getImageKey(sources.fallback)}>
            <source srcSet={sources.webp} type="image/webp" sizes={sizes} />
            <source srcSet={sources.avif} type="image/avif" sizes={sizes} />
            <img
              className="object-contain w-full h-full absolute inset-0"
              src={sources.fallback}
              alt={sponsor.businessName}
              width={imageWidth}
              height={Math.round(imageWidth / SPONSOR_BANNER_IMAGE.IDEAL_ASPECT_RATIO)}
              loading="lazy"
              decoding="async"
              onError={handleError}
              onLoad={handleImageLoad}
              sizes={sizes}
              // Always visible - no opacity transitions that cause flicker
              // The skeleton behind handles loading state visually
            />
          </picture>
        </div>
      </a>
    </div>
  );
}
