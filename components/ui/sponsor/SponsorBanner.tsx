"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { SponsorBannerProps } from "types/sponsor";
import { SPONSOR_BANNER_IMAGE } from "@utils/constants";
import { useImageRetry } from "@components/hooks/useImageRetry";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
  getResponsiveWidths,
} from "@utils/image-quality";
import { buildResponsivePictureSourceUrls } from "@utils/image-cache";

/**
 * Client component that renders the sponsor banner with image error handling.
 * Shows the sponsor image with proper SEO attributes and fallback on error.
 *
 * Used for both paid sponsors and venue house ads (visually identical).
 * Text house ads are handled separately by TextHouseAd component.
 *
 * Image loading strategy (flicker-free):
 * - Banner container is always visible (no hydration-dependent visibility)
 * - Image starts fully visible for SSR compatibility (no opacity transitions)
 * - Skeleton indicates loading state while image loads
 * - Only hides on persistent error (after retries exhausted)
 */
export default function SponsorBanner({
  sponsor,
  place,
}: SponsorBannerProps) {
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
  const responsiveWidths = getResponsiveWidths("hero");
  const imageWidth = responsiveWidths.length > 0 ? Math.max(...responsiveWidths) : 1200;
  const sizes = getOptimalImageSizes("hero");
  const sources = buildResponsivePictureSourceUrls(sponsor.imageUrl, undefined, {
    quality: imageQuality,
  }, responsiveWidths);

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

  const bannerLabel = t("label");
  const imageAlt = sponsor.businessName;

  const bannerClassName = `group block w-full overflow-hidden rounded-card bg-muted/20 transition-shadow hover:shadow-md focus-ring ${imageLoaded ? "border border-transparent" : "border border-border"
    }`;

  const bannerContent = (
    <>
      <div className="flex-start px-card-padding-sm pt-card-padding-sm pb-element-gap-sm">
        <span className="badge-default">{bannerLabel}</span>
      </div>
      <div
        className="relative w-full min-h-[80px] max-h-[160px] md:min-h-[100px] md:max-h-[180px]"
        style={{ aspectRatio }}
      >
        {showSkeleton && !imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-fast-pulse" />
        )}
        <picture key={getImageKey(sources.fallback)}>
          <source srcSet={sources.webpSrcSet} type="image/webp" sizes={sizes} />
          <source srcSet={sources.avifSrcSet} type="image/avif" sizes={sizes} />
          <img
            className="object-contain w-full h-full absolute inset-0"
            src={sources.fallback}
            alt={imageAlt}
            width={imageWidth}
            height={Math.round(imageWidth / SPONSOR_BANNER_IMAGE.IDEAL_ASPECT_RATIO)}
            decoding="async"
            onError={handleError}
            onLoad={handleImageLoad}
            sizes={sizes}
          />
        </picture>
      </div>
    </>
  );

  return (
    <div className="relative w-full mt-6" data-testid="sponsor-banner">
      <a
        href={sponsor.targetUrl}
        target="_blank"
        rel="sponsored noopener"
        className={bannerClassName}
        data-analytics-event-name="sponsor_click"
        data-analytics-link-type="sponsor_website"
        data-analytics-sponsor-name={sponsor.businessName}
        data-analytics-sponsor-place={place}
        data-analytics-sponsor-geo-scope={sponsor.geoScope}
        data-analytics-sponsor-url={sponsor.targetUrl}
      >
        {bannerContent}
      </a>
    </div>
  );
}
